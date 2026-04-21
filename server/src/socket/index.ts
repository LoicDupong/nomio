import http from 'http';
import { Server } from 'socket.io';
import jwt, { JsonWebTokenError } from 'jsonwebtoken';
import { TripMember } from '../models';

let io: Server | undefined;

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('join:trip', async ({ trip_id, token, guest_token }: {
      trip_id: string;
      token?: string;
      guest_token?: string;
    }) => {
      if (!trip_id || typeof trip_id !== 'string') {
        socket.emit('error', 'trip_id is required');
        return;
      }

      try {
        let member: TripMember | null = null;

        if (token) {
          try {
            const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
            member = await TripMember.findOne({ where: { trip_id, user_id: payload.id } });
          } catch (err) {
            socket.emit('error', err instanceof JsonWebTokenError ? 'Invalid token' : 'Server error');
            return;
          }
        }

        if (!member && guest_token) {
          try {
            const payload = jwt.verify(guest_token, process.env.GUEST_JWT_SECRET!) as {
              member_id: string;
              trip_id: string;
            };
            if (payload.trip_id !== trip_id) {
              socket.emit('error', 'Token trip mismatch');
              return;
            }
            member = await TripMember.findByPk(payload.member_id);
            if (!member || member.trip_id !== trip_id) {
              socket.emit('error', 'Not authorized for this trip');
              return;
            }
          } catch (err) {
            if (!(err instanceof JsonWebTokenError)) {
              socket.emit('error', 'Server error');
              return;
            }
          }
        }

        if (!member) {
          socket.emit('error', 'Not authorized for this trip');
          return;
        }

        socket.join(`trip:${trip_id}`);
      } catch {
        socket.emit('error', 'Server error');
      }
    });
  });
}

export function getIO(): Server {
  if (!io) throw new Error('Socket not initialized');
  return io;
}
