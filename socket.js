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

  // Track online users
  const onlineUsers = new Set();

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected`);
    
    // Add user to online users
    onlineUsers.add(socket.userId);
    
    // Join personal room
    socket.join(`user:${socket.userId}`);
    
    // Notify other users that this user is online
    socket.broadcast.emit('user:joined', socket.userId);
    
    // Send list of online users to the newly connected user
    socket.emit('users:online', Array.from(onlineUsers));

    // Join a trip room
    socket.on('trip:join', (tripId) => {
      if (typeof tripId === 'string') {
        console.log(`User ${socket.userId} joined trip room ${tripId}`);
        socket.join(`trip:${tripId}`);
        
        // Notify others in the trip room
        socket.to(`trip:${tripId}`).emit('trip:user_joined', {
          userId: socket.userId,
          tripId: tripId,
        });
      }
    });

    socket.on('trip:leave', (tripId) => {
      if (typeof tripId === 'string') {
        console.log(`User ${socket.userId} left trip room ${tripId}`);
        socket.leave(`trip:${tripId}`);
        
        // Notify others in the trip room
        socket.to(`trip:${tripId}`).emit('trip:user_left', {
          userId: socket.userId,
          tripId: tripId,
        });
      }
    });

    // Handle trip updates broadcast
    socket.on('trip:broadcast_update', (data) => {
      const { tripId, update, updatedBy, timestamp } = data;
      if (tripId) {
        console.log(`Broadcasting trip update for trip ${tripId}`);
        
        // Broadcast to all other users in the trip room
        socket.to(`trip:${tripId}`).emit('trip:updated', {
          tripId,
          update,
          updatedBy,
          timestamp,
        });
      }
    });

    // Handle trip comments
    socket.on('trip:add_comment', (data) => {
      const { tripId, comment, author, timestamp } = data;
      if (tripId) {
        console.log(`New comment on trip ${tripId} from ${author?.username}`);
        
        // Broadcast to all users in the trip room
        io.to(`trip:${tripId}`).emit('trip:comment_added', {
          tripId,
          comment: {
            content: comment,
            author,
            timestamp,
            id: Date.now(), // Generate temporary ID
          },
        });
      }
    });

    // Handle real-time cursors/presence in trip editing
    socket.on('trip:cursor_move', (data) => {
      const { tripId, position, section } = data;
      if (tripId) {
        socket.to(`trip:${tripId}`).emit('trip:cursor_update', {
          userId: socket.userId,
          position,
          section,
          timestamp: Date.now(),
        });
      }
    });

    // Handle typing indicators
    socket.on('trip:typing_start', (data) => {
      const { tripId, section } = data;
      if (tripId) {
        socket.to(`trip:${tripId}`).emit('trip:user_typing', {
          userId: socket.userId,
          section,
          typing: true,
        });
      }
    });

    socket.on('trip:typing_stop', (data) => {
      const { tripId, section } = data;
      if (tripId) {
        socket.to(`trip:${tripId}`).emit('trip:user_typing', {
          userId: socket.userId,
          section,
          typing: false,
        });
      }
    });

    // Send notification to specific user
    socket.on('notification:send', (data) => {
      const { userId, notification } = data;
      if (userId && notification) {
        io.to(`user:${userId}`).emit('notification', {
          ...notification,
          id: Date.now(),
          timestamp: new Date(),
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`);
      
      // Remove user from online users
      onlineUsers.delete(socket.userId);
      
      // Notify other users that this user is offline
      socket.broadcast.emit('user:left', socket.userId);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  return io;
}

module.exports = { initSocket };