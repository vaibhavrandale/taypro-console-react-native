import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../api/client';
import { SOCKET_URL } from '../config/socket';

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket) {
    return socket;
  }

  const token = await getAuthToken();

  socket = io(SOCKET_URL, {
    auth: token ? { token } : undefined,
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
