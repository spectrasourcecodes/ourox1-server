const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');
const { sendEmail } = require('./emailService'); // we already have emailService

class NotificationService {
  // Create in-app notification
  async createNotification(userId, title, message, type = 'info', data = {}) {
    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      data,
    });
    await notification.save();

    // Emit via socket.io if available
    const io = require('../../server').io; // we'll export io from server.js
    if (io) {
      const userSocket = global.userSockets?.[userId]; // we'll track connections
      if (userSocket) {
        io.to(userSocket).emit('notification', notification);
      }
    }

    return notification;
  }

  // Send email notification
  async sendEmailNotification(userId, subject, html) {
    const user = await User.findById(userId);
    if (!user) return;
    // Use the emailService
    const { sendMail } = require('./emailService');
    await sendMail(user.email, subject, html);
  }

  // Create and send both in-app and email
  async notifyUser(userId, title, message, type = 'info', data = {}, sendEmail = false) {
    const notification = await this.createNotification(userId, title, message, type, data);
    if (sendEmail) {
      await this.sendEmailNotification(userId, title, message);
    }
    return notification;
  }

  // Get user notifications (paginated)
  async getUserNotifications(userId, page = 1, limit = 20) {
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);
    const total = await Notification.countDocuments({ user: userId });
    return { data: notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  // Mark as read
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({ _id: notificationId, user: userId });
    if (!notification) throw new AppError('Notification not found', 404);
    notification.read = true;
    notification.readAt = new Date();
    await notification.save();
    return notification;
  }

  // Mark all as read
  async markAllAsRead(userId) {
    await Notification.updateMany({ user: userId, read: false }, { read: true, readAt: new Date() });
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    await Notification.findOneAndDelete({ _id: notificationId, user: userId });
  }
}

module.exports = new NotificationService();