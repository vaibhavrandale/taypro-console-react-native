export type VoiceCallStatus =
  | 'ringing'
  | 'accepted'
  | 'rejected'
  | 'ended'
  | 'missed';

export type VoiceCallUserSnapshot = {
  _id: string;
  username?: string;
  email?: string;
  role?: string;
  profile_image?: string | null;
};

export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type VoiceCall = {
  _id: string;
  caller_id: string;
  callee_id: string;
  caller_snapshot?: VoiceCallUserSnapshot;
  callee_snapshot?: VoiceCallUserSnapshot;
  status: VoiceCallStatus;
  channel_name: string;
  site_id?: string;
  started_at?: string | null;
  ended_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
  iceServers?: IceServerConfig[];
};

export type VoiceCallContact = {
  _id: string;
  username: string;
  email?: string;
  role?: string;
  profile_image?: string;
  department?: string;
  designation?: string;
};

export type CallSignalPayload = {
  callId: string;
  toUserId: string;
  type: 'offer' | 'answer' | 'ice';
  sdp?: { type: string; sdp?: string };
  candidate?: {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
  } | null;
};
