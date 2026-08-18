import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Vibration } from 'react-native';
import type { Socket } from 'socket.io-client';
import {
  acceptVoiceCall,
  endVoiceCall,
  fetchVoiceCall,
  rejectVoiceCall,
  startVoiceCall,
} from '../api/voiceCalls';
import { useAuth } from './AuthContext';
import { getSocket } from '../lib/socket';
import {
  addRemoteIceCandidate,
  answerAsCallee,
  applyRemoteAnswer,
  destroyVoiceEngine,
  leaveVoiceChannel,
  setMuted,
  setSpeakerOn,
  startAsCaller,
  subscribeAudioLevels,
} from '../services/webrtcVoice';
import {
  addCallNotificationResponseListener,
  consumeLaunchCallId,
  registerForCallPushAsync,
  unregisterCallPushAsync,
} from '../services/pushNotifications';
import type { CallSignalPayload, VoiceCall } from '../types/voiceCall';

type VoiceCallPhase =
  | 'idle'
  | 'outgoing'
  | 'incoming'
  | 'connecting'
  | 'active'
  | 'ended';

type VoiceCallContextValue = {
  phase: VoiceCallPhase;
  call: VoiceCall | null;
  error: string | null;
  muted: boolean;
  speakerOn: boolean;
  submitting: boolean;
  audioLevels: {
    localLevel: number;
    remoteLevel: number;
    isLocalTalking: boolean;
    isRemoteTalking: boolean;
  };
  startCall: (calleeId: string) => Promise<void>;
  accept: () => Promise<void>;
  reject: () => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  clearError: () => void;
};

const VoiceCallContext = createContext<VoiceCallContextValue | null>(null);

function isSameCall(current: VoiceCall | null, incoming: VoiceCall) {
  return current != null && String(current._id) === String(incoming._id);
}

export function VoiceCallProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [phase, setPhase] = useState<VoiceCallPhase>('idle');
  const [call, setCall] = useState<VoiceCall | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [speakerOn, setSpeakerState] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [audioLevels, setAudioLevels] = useState({
    localLevel: 0,
    remoteLevel: 0,
    isLocalTalking: false,
    isRemoteTalking: false,
  });
  const callRef = useRef<VoiceCall | null>(null);
  const phaseRef = useRef<VoiceCallPhase>('idle');
  const speakerRef = useRef(true);
  const socketRef = useRef<Socket | null>(null);
  const userIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    speakerRef.current = speakerOn;
  }, [speakerOn]);

  useEffect(() => {
    userIdRef.current = user?._id;
  }, [user?._id]);

  const peerUserId = useCallback((current: VoiceCall) => {
    const me = String(userIdRef.current || '');
    return String(current.caller_id) === me
      ? String(current.callee_id)
      : String(current.caller_id);
  }, []);

  const emitSignal = useCallback(
    (
      current: VoiceCall,
      payload: Omit<CallSignalPayload, 'callId' | 'toUserId'>,
    ) => {
      socketRef.current?.emit('call:signal', {
        ...payload,
        callId: current._id,
        toUserId: peerUserId(current),
      } satisfies CallSignalPayload);
    },
    [peerUserId],
  );

  const resetLocal = useCallback(() => {
    Vibration.cancel();
    leaveVoiceChannel();
    setMutedState(false);
    setSpeakerState(true);
    void setSpeakerOn(true);
    setMuted(false);
    setPhase('idle');
    setCall(null);
    setSubmitting(false);
  }, []);

  const finishCall = useCallback(
    (next: VoiceCall) => {
      Vibration.cancel();
      leaveVoiceChannel();
      setCall(next);
      setPhase('ended');
      setTimeout(() => {
        if (callRef.current && String(callRef.current._id) === String(next._id)) {
          resetLocal();
        }
      }, 1500);
    },
    [resetLocal],
  );

  const beginCallerOffer = useCallback(
    async (current: VoiceCall) => {
      const offer = await startAsCaller({
        iceServers: current.iceServers,
        speakerOn: speakerRef.current,
        onLocalIce: (ice) => emitSignal(current, ice),
      });
      emitSignal(current, { type: 'offer', sdp: offer });
      setPhase('active');
    },
    [emitSignal],
  );

  const startCall = useCallback(
    async (calleeId: string) => {
      if (!user?._id) return;
      if (phaseRef.current !== 'idle') {
        setError('You are already on a call');
        return;
      }
      setError(null);
      setSubmitting(true);
      try {
        const created = await startVoiceCall(calleeId);
        setCall(created);
        setPhase('outgoing');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start call');
        resetLocal();
      } finally {
        setSubmitting(false);
      }
    },
    [resetLocal, user?._id],
  );

  // Tapping a call push while the socket was asleep means we likely missed the
  // live call:incoming event, so pull the call and show it if still ringing.
  const resumeIncomingCall = useCallback(
    async (callId: string) => {
      if (phaseRef.current !== 'idle') return;
      try {
        const fresh = await fetchVoiceCall(callId);
        if (fresh.status !== 'ringing') return;
        if (String(fresh.callee_id) !== String(userIdRef.current || '')) return;
        setCall(fresh);
        setPhase('incoming');
        setError(null);
      } catch {
        // call likely already ended/missed; ignore
      }
    },
    [],
  );

  const accept = useCallback(async () => {
    const current = callRef.current;
    if (!current) return;
    setSubmitting(true);
    setError(null);
    Vibration.cancel();
    try {
      setPhase('connecting');
      const updated = await acceptVoiceCall(current._id);
      setCall(updated);
      // Wait for caller's WebRTC offer via call:signal
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept call');
      setPhase('incoming');
    } finally {
      setSubmitting(false);
    }
  }, []);

  const reject = useCallback(async () => {
    const current = callRef.current;
    if (!current) return;
    setSubmitting(true);
    try {
      const updated = await rejectVoiceCall(current._id);
      finishCall(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject call');
      resetLocal();
    } finally {
      setSubmitting(false);
    }
  }, [finishCall, resetLocal]);

  const hangUp = useCallback(async () => {
    const current = callRef.current;
    if (!current) {
      resetLocal();
      return;
    }
    setSubmitting(true);
    try {
      const updated = await endVoiceCall(current._id);
      finishCall(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end call');
      resetLocal();
    } finally {
      setSubmitting(false);
    }
  }, [finishCall, resetLocal]);

  const toggleMute = useCallback(() => {
    setMutedState((prev) => {
      const next = !prev;
      setMuted(next);
      return next;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeakerState((prev) => {
      const next = !prev;
      void setSpeakerOn(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) {
      destroyVoiceEngine();
      resetLocal();
      return;
    }

    let cancelled = false;
    let socketInstance: Socket | null = null;

    const onIncoming = (payload: VoiceCall) => {
      if (!payload?._id) return;
      if (phaseRef.current !== 'idle') return;
      if (String(payload.callee_id) !== String(user._id)) return;
      setCall(payload);
      setPhase('incoming');
      setError(null);
      if (AppState.currentState === 'active') {
        Vibration.vibrate([0, 800, 700], true);
      }
    };

    const onAccepted = async (payload: VoiceCall) => {
      if (!isSameCall(callRef.current, payload)) return;
      setCall((prev) => ({ ...(prev || payload), ...payload }));
      if (String(payload.caller_id) === String(user._id)) {
        setPhase('connecting');
        try {
          await beginCallerOffer({ ...(callRef.current || payload), ...payload });
        } catch (err) {
          setError(
            err instanceof Error ? err.message : 'Failed to start WebRTC offer',
          );
        }
      } else {
        setPhase('connecting');
      }
    };

    const onRejected = (payload: VoiceCall) => {
      if (!isSameCall(callRef.current, payload)) return;
      finishCall(payload);
    };

    const onEnded = (payload: VoiceCall) => {
      if (!isSameCall(callRef.current, payload)) return;
      finishCall(payload);
    };

    const onMissed = (payload: VoiceCall) => {
      if (isSameCall(callRef.current, payload)) {
        finishCall(payload);
      }
    };

    const onSignal = async (payload: CallSignalPayload) => {
      const current = callRef.current;
      if (!current || String(payload.callId) !== String(current._id)) return;

      try {
        if (payload.type === 'offer' && payload.sdp) {
          const answer = await answerAsCallee({
            iceServers: current.iceServers,
            speakerOn: speakerRef.current,
            remoteOffer: payload.sdp,
            onLocalIce: (ice) => emitSignal(current, ice),
          });
          emitSignal(current, { type: 'answer', sdp: answer });
          setPhase('active');
        } else if (payload.type === 'answer' && payload.sdp) {
          await applyRemoteAnswer(payload.sdp);
          setPhase('active');
        } else if (payload.type === 'ice') {
          await addRemoteIceCandidate(payload.candidate ?? null);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'WebRTC signaling failed',
        );
      }
    };

    const joinRoom = () => {
      socketInstance?.emit('join_user_room', user._id);
      socketInstance?.emit('join', {
        _id: user._id,
        username: user.username,
        email: user.email,
        profile_image: user.profile_image,
      });
    };

    void (async () => {
      try {
        socketInstance = await getSocket();
        if (cancelled) return;
        socketRef.current = socketInstance;
        if (socketInstance.connected) joinRoom();
        else socketInstance.once('connect', joinRoom);

        socketInstance.on('call:incoming', onIncoming);
        socketInstance.on('call:accepted', onAccepted);
        socketInstance.on('call:rejected', onRejected);
        socketInstance.on('call:ended', onEnded);
        socketInstance.on('call:missed', onMissed);
        socketInstance.on('call:signal', onSignal);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to connect call socket',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      Vibration.cancel();
      if (socketInstance) {
        socketInstance.off('call:incoming', onIncoming);
        socketInstance.off('call:accepted', onAccepted);
        socketInstance.off('call:rejected', onRejected);
        socketInstance.off('call:ended', onEnded);
        socketInstance.off('call:missed', onMissed);
        socketInstance.off('call:signal', onSignal);
        socketInstance.emit('leave_user_room', user._id);
      }
      if (socketRef.current === socketInstance) {
        socketRef.current = null;
      }
    };
  }, [
    beginCallerOffer,
    emitSignal,
    finishCall,
    isAuthenticated,
    resetLocal,
    user,
  ]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (phaseRef.current === 'incoming') {
        if (state === 'active') Vibration.vibrate([0, 800, 700], true);
        else Vibration.cancel();
      }
      if (state === 'active' && callRef.current?._id) {
        void fetchVoiceCall(callRef.current._id)
          .then((fresh) => {
            if (['ended', 'rejected', 'missed'].includes(fresh.status)) {
              finishCall(fresh);
            } else {
              setCall(fresh);
            }
          })
          .catch(() => undefined);
      }
    });
    return () => sub.remove();
  }, [finishCall]);

  useEffect(() => {
    return () => {
      destroyVoiceEngine();
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;
    void registerForCallPushAsync();
    void consumeLaunchCallId().then((callId) => {
      if (callId) void resumeIncomingCall(callId);
    });
    const unsubscribe = addCallNotificationResponseListener((callId) => {
      void resumeIncomingCall(callId);
    });
    return unsubscribe;
  }, [isAuthenticated, resumeIncomingCall, user?._id]);

  useEffect(() => {
    if (phase === 'idle' || phase === 'ended' || phase === 'incoming') {
      setAudioLevels({
        localLevel: 0,
        remoteLevel: 0,
        isLocalTalking: false,
        isRemoteTalking: false,
      });
      return undefined;
    }
    return subscribeAudioLevels(setAudioLevels);
  }, [phase]);

  const value = useMemo<VoiceCallContextValue>(
    () => ({
      phase,
      call,
      error,
      muted,
      speakerOn,
      submitting,
      audioLevels,
      startCall,
      accept,
      reject,
      hangUp,
      toggleMute,
      toggleSpeaker,
      clearError: () => setError(null),
    }),
    [
      accept,
      audioLevels,
      call,
      error,
      hangUp,
      muted,
      phase,
      reject,
      speakerOn,
      startCall,
      submitting,
      toggleMute,
      toggleSpeaker,
    ],
  );

  return (
    <VoiceCallContext.Provider value={value}>{children}</VoiceCallContext.Provider>
  );
}

export function useVoiceCall() {
  const ctx = useContext(VoiceCallContext);
  if (!ctx) {
    throw new Error('useVoiceCall must be used within VoiceCallProvider');
  }
  return ctx;
}
