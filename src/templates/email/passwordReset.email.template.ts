import 'dotenv/config';
import { sendEmail } from '../../utils/email.util.js';
import { baseEmailTemplate } from './base.emai..template.js';

const APP_NAME = process.env.APP_NAME || 'Odoo Rental Platform';

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  code: string,
  expiresInMinutes: number = 15
): Promise<boolean> {
  const content = `
    <div class="content">
      <h2>Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Use the verification code below to proceed:</p>
      <div class="code-box">
        <span class="code">${code}</span>
      </div>
      <p>This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
      <div class="warning">
        <p><strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account is safe.</p>
      </div>
      <p>Best regards,<br>The ${APP_NAME} Team</p>
    </div>
  `;

  return sendEmail(
    to,
    `Password Reset Code - ${APP_NAME}`,
    baseEmailTemplate(content)
  );
}
