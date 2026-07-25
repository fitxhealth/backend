/**
 * services/otpService.js
 *
 * Abstracts OTP delivery behind a unified interface.
 * Providers: Resend (email) | MSG91 (phone)
 * Never import provider SDKs directly in controllers — always go through here.
 */

const { Resend } = require('resend');
const axios = require('axios');

// ── Email via Resend ──────────────────────────────────────────────────────────

/**
 * Send a 6-digit OTP to an email address via Resend.
 * @param {string} email
 * @param {string} otp  Plain 6-digit code
 */
async function sendEmailOtp(email, otp) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured.');
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'Living Result <noreply@getlivingresult.in>',
    to: [email],
    subject: `${otp} is your Living Result verification code`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <h1 style="color: #ff6b35; font-size: 22px; letter-spacing: 2px; margin: 0;">LIVING RESULT</h1>
        </div>
        <h2 style="font-size: 18px; margin-bottom: 8px;">Your verification code</h2>
        <p style="color: #aaa; font-size: 14px; margin-bottom: 24px;">Use this code to sign in or create your account. It expires in <strong style="color: #fff;">5 minutes</strong>.</p>
        <div style="background: #1a1a1a; border: 1px solid #ff6b3544; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 42px; font-weight: 700; letter-spacing: 10px; color: #ff6b35;">${otp}</span>
        </div>
        <p style="color: #666; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    console.error('[otpService] Resend error:', error);
    throw new Error('Failed to send email OTP. Please try again.');
  }
}

// ── Phone via MSG91 ───────────────────────────────────────────────────────────

/**
 * Send a 6-digit OTP to a phone number via MSG91.
 * @param {string} phone  10-digit Indian mobile number (without +91)
 * @param {string} otp  Plain 6-digit code
 */
async function sendPhoneOtp(phone, otp) {
  if (!process.env.MSG91_AUTH_KEY) {
    throw new Error('MSG91_AUTH_KEY is not configured.');
  }

  const mobile = phone.startsWith('91') ? phone : `91${phone}`;

  const payload = {
    template_id: process.env.MSG91_TEMPLATE_ID,
    mobile,
    authkey: process.env.MSG91_AUTH_KEY,
    otp,
  };

  try {
    const { data } = await axios.post(
      'https://api.msg91.com/api/v5/otp',
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (data?.type === 'error') {
      console.error('[otpService] MSG91 error:', data);
      throw new Error('Failed to send SMS OTP. Please try again.');
    }
  } catch (err) {
    console.error('[otpService] MSG91 request failed:', err.message);
    throw new Error('Failed to send SMS OTP. Please try again.');
  }
}

// ── Unified Entry Point ───────────────────────────────────────────────────────

/**
 * Send OTP via the appropriate provider.
 * @param {'email'|'phone'} type
 * @param {string} identifier  Email or 10-digit phone number
 * @param {string} otp  Plain 6-digit OTP
 */
async function sendOtp(type, identifier, otp) {
  if (type === 'email') {
    return sendEmailOtp(identifier, otp);
  }
  if (type === 'phone') {
    return sendPhoneOtp(identifier, otp);
  }
  throw new Error(`Unknown OTP type: ${type}`);
}

module.exports = { sendOtp };
