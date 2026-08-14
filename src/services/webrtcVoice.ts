import { PermissionsAndroid, Platform } from 'react-native';
import Constants from 'expo-constants';
import type { IceServerConfig } from '../types/voiceCall';

type WebRtcModule = typeof import('react-native-webrtc');
type PeerConnection = InstanceType<WebRtcModule['RTCPeerConnection']>;
type MediaStream = InstanceType<WebRtcModule['MediaStream']>;

let webrtc: WebRtcModule | null | undefined;
let pc: PeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
const pendingRemoteCandidates: unknown[] = [];
let remoteDescriptionSet = false;
let levelTimer: ReturnType<typeof setInterval> | null = null;
let levelsListener:
  | ((levels: {
      localLevel: number;
      remoteLevel: number;
      isLocalTalking: boolean;
      isRemoteTalking: boolean;
    }) => void)
  | null = null;

const REBUILD_MESSAGE =
  'Voice calls need a rebuilt Nectyr development build with react-native-webrtc. Expo Go is not supported. Run: eas build --profile development --platform android';

function loadWebRtc(): WebRtcModule {
  if (Constants.appOwnership === 'expo') {
    throw new Error(REBUILD_MESSAGE);
  }
  if (webrtc) return webrtc;
  if (webrtc === null) {
    throw new Error(REBUILD_MESSAGE);
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    webrtc = require('react-native-webrtc') as WebRtcModule;
    return webrtc;
  } catch {
    webrtc = null;
    throw new Error(REBUILD_MESSAGE);
  }
}

export function isWebRtcNativeAvailable(): boolean {
  if (Constants.appOwnership === 'expo') return false;
  if (Constants.executionEnvironment === 'storeClient') return false;
  try {
    loadWebRtc();
    return true;
  } catch {
    return false;
  }
}

export async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone permission',
      message: 'Nectyr needs microphone access for voice calls.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

async function ensureAudioSession(speakerOn: boolean) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Audio } = require('expo-av') as typeof import('expo-av');
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: !speakerOn,
    });
  } catch {
    // ignore
  }
}

function defaultIceServers(): IceServerConfig[] {
  return [{ urls: 'stun:stun.l.google.com:19302' }];
}

export type SignalSend = (payload: {
  type: 'offer' | 'answer' | 'ice';
  sdp?: { type: string; sdp?: string };
  candidate?: {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
  } | null;
}) => void;

function startLevelLoop() {
  if (levelTimer) return;
  levelTimer = setInterval(() => {
    void pollLevels();
  }, 400);
}

function stopLevelLoop() {
  if (levelTimer) {
    clearInterval(levelTimer);
    levelTimer = null;
  }
}

async function pollLevels() {
  if (!levelsListener || !pc) return;
  let remoteLevel = 0;
  let localLevel = 0;
  try {
    const stats = await pc.getStats();
    stats.forEach((report: Record<string, unknown>) => {
      const type = String(report.type || '');
      const kind = String(report.kind || report.mediaType || '');
      if (kind && kind !== 'audio') return;
      const level =
        typeof report.audioLevel === 'number'
          ? report.audioLevel
          : typeof report.totalAudioEnergy === 'number'
            ? Math.min(1, Number(report.totalAudioEnergy))
            : 0;
      if (type.includes('inbound') || type === 'track') {
        remoteLevel = Math.max(remoteLevel, level);
      }
      if (type.includes('outbound') || type === 'media-source') {
        localLevel = Math.max(localLevel, level);
      }
    });
  } catch {
    // ignore stats failures
  }

  // Fallback: if remote track exists and is live, show a small pulse baseline
  const remoteLive = Boolean(
    remoteStream?.getAudioTracks?.().some((t) => t.readyState === 'live'),
  );
  if (remoteLive && remoteLevel < 0.02) {
    // keep near-zero unless talking — don't fake speaking
  }

  levelsListener({
    localLevel,
    remoteLevel,
    isLocalTalking: localLevel > 0.05,
    isRemoteTalking: remoteLevel > 0.05,
  });
}

async function ensurePeer(options: {
  iceServers?: IceServerConfig[];
  speakerOn: boolean;
  onLocalIce: SignalSend;
}): Promise<PeerConnection> {
  const mod = loadWebRtc();
  if (pc) return pc;

  const allowed = await ensureMicPermission();
  if (!allowed) {
    throw new Error('Microphone permission is required for voice calls');
  }

  await ensureAudioSession(options.speakerOn);

  const stream = (await mod.mediaDevices.getUserMedia({
    audio: true,
    video: false,
  })) as MediaStream;
  localStream = stream;

  pc = new mod.RTCPeerConnection({
    iceServers: options.iceServers?.length
      ? options.iceServers
      : defaultIceServers(),
  });

  for (const track of stream.getTracks()) {
    pc.addTrack(track, stream);
  }

  // Critical: receive + keep remote audio track so it can play
  // @ts-expect-error RN WebRTC event typing varies by version
  pc.ontrack = (event: { streams?: MediaStream[]; track: { kind: string } }) => {
    const inbound =
      event.streams?.[0] ||
      remoteStream ||
      (new mod.MediaStream([event.track as never]) as MediaStream);
    if (!event.streams?.length && event.track) {
      try {
        inbound.addTrack(event.track as never);
      } catch {
        // ignore
      }
    }
    remoteStream = inbound;
    startLevelLoop();
  };

  pc.onicecandidate = (event: {
    candidate?: {
      candidate: string;
      sdpMLineIndex: number | null;
      sdpMid: string | null;
    } | null;
  }) => {
    if (!event.candidate) return;
    options.onLocalIce({
      type: 'ice',
      candidate: {
        candidate: event.candidate.candidate,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        sdpMid: event.candidate.sdpMid,
      },
    });
  };

  startLevelLoop();
  return pc;
}

async function flushPendingRemoteCandidates(mod: WebRtcModule) {
  if (!pc || !remoteDescriptionSet) return;
  while (pendingRemoteCandidates.length) {
    const raw = pendingRemoteCandidates.shift();
    try {
      await pc.addIceCandidate(new mod.RTCIceCandidate(raw as object));
    } catch {
      // ignore
    }
  }
}

export async function startAsCaller(options: {
  iceServers?: IceServerConfig[];
  speakerOn: boolean;
  onLocalIce: SignalSend;
}): Promise<{ type: string; sdp?: string }> {
  const mod = loadWebRtc();
  remoteDescriptionSet = false;
  pendingRemoteCandidates.length = 0;
  const peer = await ensurePeer(options);
  const offer = await peer.createOffer({});
  await peer.setLocalDescription(offer);
  return { type: offer.type, sdp: offer.sdp };
}

export async function answerAsCallee(options: {
  iceServers?: IceServerConfig[];
  speakerOn: boolean;
  remoteOffer: { type: string; sdp?: string };
  onLocalIce: SignalSend;
}): Promise<{ type: string; sdp?: string }> {
  const mod = loadWebRtc();
  remoteDescriptionSet = false;
  pendingRemoteCandidates.length = 0;
  const peer = await ensurePeer(options);
  await peer.setRemoteDescription(
    new mod.RTCSessionDescription(options.remoteOffer as object),
  );
  remoteDescriptionSet = true;
  await flushPendingRemoteCandidates(mod);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  return { type: answer.type, sdp: answer.sdp };
}

export async function applyRemoteAnswer(answer: {
  type: string;
  sdp?: string;
}) {
  const mod = loadWebRtc();
  if (!pc) return;
  await pc.setRemoteDescription(new mod.RTCSessionDescription(answer as object));
  remoteDescriptionSet = true;
  await flushPendingRemoteCandidates(mod);
}

export async function addRemoteIceCandidate(candidate: {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
} | null) {
  if (!candidate) return;
  const mod = loadWebRtc();
  if (!pc || !remoteDescriptionSet) {
    pendingRemoteCandidates.push(candidate);
    return;
  }
  try {
    await pc.addIceCandidate(new mod.RTCIceCandidate(candidate as object));
  } catch {
    // ignore
  }
}

export function setMuted(muted: boolean) {
  localStream?.getAudioTracks().forEach((track) => {
    track.enabled = !muted;
  });
}

export async function setSpeakerOn(on: boolean) {
  await ensureAudioSession(on);
}

export function subscribeAudioLevels(
  listener: (levels: {
    localLevel: number;
    remoteLevel: number;
    isLocalTalking: boolean;
    isRemoteTalking: boolean;
  }) => void,
) {
  levelsListener = listener;
  startLevelLoop();
  return () => {
    if (levelsListener === listener) levelsListener = null;
  };
}

export function getRemoteStream() {
  return remoteStream;
}

export function leaveVoiceChannel() {
  try {
    localStream?.getTracks().forEach((t) => t.stop());
    remoteStream?.getTracks().forEach((t) => t.stop());
    pc?.close();
  } catch {
    // ignore
  }
  stopLevelLoop();
  localStream = null;
  remoteStream = null;
  pc = null;
  remoteDescriptionSet = false;
  pendingRemoteCandidates.length = 0;
}

export function destroyVoiceEngine() {
  leaveVoiceChannel();
  webrtc = undefined;
}
