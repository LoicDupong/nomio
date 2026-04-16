import http from 'http';
import { Server } from 'socket.io';

let io: Server | undefined;

export function initSocket(_server: http.Server) {
  // Will be implemented in Task 8
}

export function getIO(): Server {
  if (!io) throw new Error('Socket not initialized');
  return io;
}
