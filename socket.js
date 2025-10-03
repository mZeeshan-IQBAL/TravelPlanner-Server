const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

function initSocket(server, options = {}) {
  const io = new Server(server, {
    ...options,
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Authentication middleware using JWT in query or auth header
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('auth_required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret');
      socket.userId = decoded.userId;
      return next();
    } catch (e) {
      return next(new Error('auth_failed'));
    }
  });

  io.on('connection', (socket) => {
    // Join personal room
    socket.join(`user:${socket.userId}`);

    // Join a trip room
    socket.on('trip:join', (tripId) => {
      if (typeof tripId === 'string') {
        socket.join(`trip:${tripId}`);
      }
    });

    socket.on('trip:leave', (tripId) => {
      if (typeof tripId === 'string') {
        socket.leave(`trip:${tripId}`);
      }
    });

    socket.on('disconnect', () => {
      // no-op for now
    });
  });

  return io;
}

module.exports = { initSocket };