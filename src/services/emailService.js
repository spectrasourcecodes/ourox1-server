const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Create transporter using Gmail with App Password
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
};

// Send email with optional template
const sendEmail = async (to, subject, html, text = '') => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // fallback plain text
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Email send error to ${to}: ${error.message}`);
    throw new Error('Failed to send email');
  }
};

// Send verification email
const sendVerificationEmail = async (user) => {
  try {
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #081C3A; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background: #2563EB; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Ark</h1>
              <p>Premium Investment Platform</p>
            </div>
            <div class="content">
              <h2>Welcome to Ark, ${user.fullName}!</h2>
              <p>Thank you for signing up. Please verify your email address to get started.</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #2563EB;">${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ark. All rights reserved.</p>
              <p>This email was sent to ${user.email}</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    return await sendEmail(user.email, 'Verify Your Email - Ark', html);
  } catch (error) {
    logger.error(`Verification email error: ${error.message}`);
    throw error;
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #081C3A; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Welcome to Ark</h1>
            </div>
            <div class="content">
              <h2>Hello ${user.fullName}!</h2>
              <p>Your account has been successfully created. Here's what you can do next:</p>
              <ul>
                <li>✅ Complete your KYC verification</li>
                <li>💰 Make your first deposit</li>
                <li>📈 Start investing in our premium plans</li>
              </ul>
              <p>If you have any questions, our support team is here to help.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ark. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    return await sendEmail(user.email, 'Welcome to Ark!', html);
  } catch (error) {
    logger.error(`Welcome email error: ${error.message}`);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #081C3A; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .button { 
              display: inline-block; 
              padding: 12px 30px; 
              background: #2563EB; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Ark</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your password. Click the button below to create a new password.</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link in your browser:</p>
              <p style="word-break: break-all; color: #2563EB;">${resetUrl}</p>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ark. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    return await sendEmail(user.email, 'Reset Your Password - Ark', html);
  } catch (error) {
    logger.error(`Password reset email error: ${error.message}`);
    throw error;
  }
};

// Send KYC approval email
const sendKYCApprovalEmail = async (user) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #081C3A; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ KYC Approved</h1>
            </div>
            <div class="content">
              <h2>Congratulations ${user.fullName}!</h2>
              <p>Your KYC verification has been approved. You now have full access to all features:</p>
              <ul>
                <li>💰 Make withdrawals</li>
                <li>📈 Invest in premium plans</li>
                <li>🎯 Access exclusive features</li>
              </ul>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ark. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    return await sendEmail(user.email, 'KYC Approved - Ark', html);
  } catch (error) {
    logger.error(`KYC approval email error: ${error.message}`);
    throw error;
  }
};

// Send KYC rejection email
const sendKYCRejectionEmail = async (user, reason) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ KYC Rejected</h1>
            </div>
            <div class="content">
              <h2>Hello ${user.fullName}</h2>
              <p>Your KYC verification was rejected for the following reason:</p>
              <div style="background: #FEE2E2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p style="color: #DC2626; margin: 0;">${reason || 'Please provide clearer documents.'}</p>
              </div>
              <p>Please resubmit your KYC with the correct documents.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ark. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    return await sendEmail(user.email, 'KYC Rejected - Ark', html);
  } catch (error) {
    logger.error(`KYC rejection email error: ${error.message}`);
    throw error;
  }
};

// Send deposit confirmation email
const sendDepositConfirmationEmail = async (user, deposit) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #16A34A; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Deposit Confirmed</h1>
            </div>
            <div class="content">
              <h2>Hello ${user.fullName}</h2>
              <p>Your deposit has been confirmed:</p>
              <div style="background: #F0FDF4; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Amount:</strong> $${deposit.amount}</p>
                <p><strong>Reference:</strong> ${deposit.reference}</p>
                <p><strong>Status:</strong> ${deposit.status}</p>
              </div>
              <p>You can now start investing!</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ark. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    return await sendEmail(user.email, 'Deposit Confirmed - Ark', html);
  } catch (error) {
    logger.error(`Deposit confirmation email error: ${error.message}`);
    throw error;
  }
};

// Send withdrawal confirmation email
const sendWithdrawalConfirmationEmail = async (user, withdrawal) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #F59E0B; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💸 Withdrawal Initiated</h1>
            </div>
            <div class="content">
              <h2>Hello ${user.fullName}</h2>
              <p>Your withdrawal request has been ${withdrawal.status}:</p>
              <div style="background: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Amount:</strong> $${withdrawal.amount}</p>
                <p><strong>Reference:</strong> ${withdrawal.reference}</p>
                <p><strong>Status:</strong> ${withdrawal.status}</p>
              </div>
              <p>We'll notify you once the withdrawal is processed.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ark. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    return await sendEmail(user.email, 'Withdrawal Request - Ark', html);
  } catch (error) {
    logger.error(`Withdrawal confirmation email error: ${error.message}`);
    throw error;
  }
};

// Send a generic notification email
const sendNotificationEmail = async (user, subject, message) => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #081C3A; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📢 Notification</h1>
            </div>
            <div class="content">
              <h2>Hello ${user.fullName}</h2>
              <p>${message}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Ark. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    return await sendEmail(user.email, subject, html);
  } catch (error) {
    logger.error(`Notification email error: ${error.message}`);
    throw error;
  }
};

// Simple send mail wrapper (for backward compatibility)
const sendMail = async (to, subject, html) => {
  return await sendEmail(to, subject, html);
};

module.exports = {
  sendEmail,
  sendMail,
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendKYCApprovalEmail,
  sendKYCRejectionEmail,
  sendDepositConfirmationEmail,
  sendWithdrawalConfirmationEmail,
  sendNotificationEmail,
};