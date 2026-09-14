const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Investment = require('../models/Investment');

// Store online users
const onlineUsers = new Map();

// Store socket connections per user
const userSockets = {};

const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = decoded.id;
      socket.user = user;
      next();
    } catch (error) {
      logger.error(`Socket auth error: ${error.message}`);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    logger.info(`User ${userId} connected via socket`);

    // Store user socket
    userSockets[userId] = socket.id;
    onlineUsers.set(userId, {
      socketId: socket.id,
      connectedAt: new Date(),
      user: socket.user,
    });

    // Join user's private room
    socket.join(`user_${userId}`);

    // Send initial data on connection
    sendInitialData(socket, userId);

    // Handle joining investment updates room
    socket.on('join-investment', (investmentId) => {
      socket.join(`investment_${investmentId}`);
      logger.info(`User ${userId} joined investment ${investmentId}`);
    });

    // Handle leaving investment updates room
    socket.on('leave-investment', (investmentId) => {
      socket.leave(`investment_${investmentId}`);
      logger.info(`User ${userId} left investment ${investmentId}`);
    });

    // Handle request for real-time price updates
    socket.on('subscribe-price', (coinIds) => {
      socket.join('price_updates');
      socket.coins = coinIds || [];
      logger.info(`User ${userId} subscribed to price updates`);
    });

    socket.on('unsubscribe-price', () => {
      socket.leave('price_updates');
      delete socket.coins;
      logger.info(`User ${userId} unsubscribed from price updates`);
    });

    // Handle typing indicator for support chat
    socket.on('typing', (data) => {
      const { ticketId, isTyping } = data;
      socket.to(`ticket_${ticketId}`).emit('user-typing', {
        userId,
        isTyping,
      });
    });

    // Handle support ticket messages
    socket.on('send-ticket-message', async (data) => {
      const { ticketId, message } = data;
      try {
        // Save message to database
        const SupportTicket = require('../models/SupportTicket');
        const ticket = await SupportTicket.findById(ticketId);
        if (!ticket) {
          socket.emit('error', { message: 'Ticket not found' });
          return;
        }

        ticket.responses.push({
          message,
          sender: 'user',
          senderId: userId,
          senderModel: 'User',
          createdAt: new Date(),
        });
        await ticket.save();

        // Emit to ticket room
        io.to(`ticket_${ticketId}`).emit('new-message', {
          ticketId,
          message: {
            message,
            sender: 'user',
            senderId: userId,
            createdAt: new Date(),
          },
        });

        // Notify admin
        io.to('admin_room').emit('new-support-message', {
          ticketId,
          userId,
          message,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error(`Ticket message error: ${error.message}`);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      delete userSockets[userId];
      logger.info(`User ${userId} disconnected`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}: ${error.message}`);
    });
  });

  // Emit real-time notifications to specific user
  io.sendNotification = async (userId, notification) => {
    const socketId = userSockets[userId];
    if (socketId) {
      io.to(socketId).emit('notification', notification);
      return true;
    }
    return false;
  };

  // Emit real-time price updates to all subscribers
  io.sendPriceUpdate = (priceData) => {
    io.to('price_updates').emit('price-update', priceData);
  };

  // Emit investment status updates
  io.sendInvestmentUpdate = (investmentId, data) => {
    io.to(`investment_${investmentId}`).emit('investment-update', data);
  };

  // Broadcast admin notifications
  io.sendAdminNotification = (data) => {
    io.to('admin_room').emit('admin-notification', data);
  };

  // Handle user online status
  io.getOnlineUsers = () => {
    return Array.from(onlineUsers.keys());
  };

  // Handle user online status check
  io.isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  return io;
};

// Helper function to send initial data on connection
const sendInitialData = async (socket, userId) => {
  try {
    // Send unread notifications count
    const unreadCount = await Notification.countDocuments({
      user: userId,
      read: false,
    });
    socket.emit('unread-count', unreadCount);

    // Send wallet balance
    const wallet = await Wallet.findOne({ user: userId });
    if (wallet) {
      socket.emit('wallet-update', {
        balance: wallet.balance,
        profitBalance: wallet.profitBalance,
        referralBalance: wallet.referralBalance,
      });
    }

    // Send active investments count
    const activeInvestments = await Investment.countDocuments({
      user: userId,
      status: 'active',
    });
    socket.emit('active-investments', activeInvestments);

    // Send online status
    socket.emit('online-status', {
      online: true,
      timestamp: new Date(),
    });

    // Send recent notifications (last 5)
    const recentNotifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);
    socket.emit('recent-notifications', recentNotifications);
  } catch (error) {
    logger.error(`Error sending initial data to user ${userId}: ${error.message}`);
  }
};

// Admin room management
const joinAdminRoom = (socket) => {
  socket.join('admin_room');
};

// Export for use in server.js
module.exports = {
  initializeSocket,
  joinAdminRoom,
  userSockets,
  onlineUsers,
};