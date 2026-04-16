import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (typeof window === 'undefined') throw new Error('Socket is not available server-side');
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, { autoConnect: false });
  }
  return socket;
}

export function joinTripRoom(tripId: string) {
  if (typeof window === 'undefined') return;
  const sock = getSocket();
  const token = localStorage.getItem('token');
  const guestToken = localStorage.getItem('guest_token');

  if (!sock.connected) sock.connect();
  sock.emit('join:trip', { trip_id: tripId, token, guest_token: guestToken });
}
