/**
 * services/emailService.js — Crisis Email Notifications
 *
 * Sends HTML emails to trusted contacts when crisis language is detected.
 * Uses Nodemailer with Gmail SMTP (or any SMTP provider).
 */

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * @param {Object} contact - { name, email }
 * @param {string} userName - Name of the MindBridge user in distress
 * @param {number} severity - 1-5 severity score
 */
const sendCrisisEmail = async (contact, userName, severity) => {
  const severityText =
    severity >= 4 ? "HIGH" : severity >= 2 ? "MODERATE" : "LOW";
  const severityColor =
    severity >= 4 ? "#dc2626" : severity >= 2 ? "#f59e0b" : "#3b82f6";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
  
  <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 48px; margin-bottom: 8px;">🧠</div>
      <h1 style="color: #1e293b; margin: 0; font-size: 24px;">MindBridge Alert</h1>
    </div>

    <div style="background: ${severityColor}15; border-left: 4px solid ${severityColor}; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0; color: ${severityColor}; font-weight: 600; font-size: 14px;">
        ⚠️ ${severityText} CONCERN DETECTED
      </p>
    </div>

    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      Hi <strong>${contact.name}</strong>,
    </p>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      You're listed as a trusted contact for <strong>${userName}</strong> on MindBridge, 
      a mental wellness app. Our AI has detected language in their recent entry that 
      suggests they may be struggling right now.
    </p>

    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
      <strong>This is not an emergency alert system.</strong> Please reach out to 
      ${userName} in whatever way feels natural — a text, a call, or dropping by if possible.
    </p>

    <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px; color: #1e293b; font-size: 14px;">Crisis Resources to Share:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 2;">
        <li>iCall (India): <strong>9152987821</strong></li>
        <li>Vandrevala Foundation: <strong>1860-2662-345</strong></li>
        <li>988 Suicide & Crisis Lifeline (US): <strong>988</strong></li>
      </ul>
    </div>

    <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; text-align: center;">
      This notification was sent automatically by MindBridge because ${userName} 
      added you as a trusted contact. To unsubscribe, they must remove you from their account.
    </p>

  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"MindBridge Safety Net" <${process.env.EMAIL_USER}>`,
    to: contact.email,
    subject: `[MindBridge] ${userName} may need your support`,
    html,
  });
};

module.exports = { sendCrisisEmail };
