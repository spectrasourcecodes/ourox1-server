const AuditLog = require('../models/AuditLog');

/**
 * Log admin action
 */
const logAdminAction = async (adminId, action, resource, resourceId = null, details = {}, req = null) => {
  const log = new AuditLog({
    admin: adminId,
    action,
    resource,
    resourceId,
    details,
    ip: req ? req.ip : '',
    userAgent: req ? req.headers['user-agent'] : '',
  });
  await log.save();
  return log;
};

/**
 * Log user action
 */
const logUserAction = async (userId, action, resource, resourceId = null, details = {}, req = null) => {
  const log = new AuditLog({
    user: userId,
    action,
    resource,
    resourceId,
    details,
    ip: req ? req.ip : '',
    userAgent: req ? req.headers['user-agent'] : '',
  });
  await log.save();
  return log;
};

/**
 * Get audit logs with filters
 */
const getAuditLogs = async (filters = {}, page = 1, limit = 50) => {
  const query = {};
  if (filters.user) query.user = filters.user;
  if (filters.admin) query.admin = filters.admin;
  if (filters.action) query.action = filters.action;
  if (filters.resource) query.resource = filters.resource;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
  }

  const skip = (page - 1) * limit;
  const logs = await AuditLog.find(query)
    .populate('user', 'fullName email')
    .populate('admin', 'fullName email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
  const total = await AuditLog.countDocuments(query);
  return { logs, total, page, limit };
};

module.exports = {
  logAdminAction,
  logUserAction,
  getAuditLogs,
};