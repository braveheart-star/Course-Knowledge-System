import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAuthToken } from '../utils/token';

let io: SocketIOServer | null = null;

interface SocketData {
  userId: string;
  role: string;
}

export function initializeRealtime(server: HttpServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.query?.token as string | undefined);

      if (!token || typeof token !== 'string') {
        return next(new Error('Unauthorized'));
      }

      const payload = await verifyAuthToken(token);
      (socket.data as SocketData).userId = payload.userId;
      (socket.data as SocketData).role = payload.role;

      socket.join(payload.userId);
      if (payload.role === 'admin') {
        socket.join('admins');
      }

      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;
    console.log(`Socket connected: ${data.userId}`);

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${data.userId}`);
    });
  });
}

export function emitNotificationUpdate(userId: string, notification?: any) {
  if (!io) return;
  io.to(userId).emit('notification:update', notification);
}

export function emitAdminEnrollmentUpdate(enrollmentData?: any) {
  if (!io) return;
  io.to('admins').emit('admin:enrollment:update', enrollmentData);
}

export function emitUserEnrollmentUpdate(userId: string, enrollmentData?: any) {
  if (!io) return;
  io.to(userId).emit('user:enrollment:update', enrollmentData);
}

