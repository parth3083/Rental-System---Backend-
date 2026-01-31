import 'dotenv/config';
import { sendEmail } from '../../utils/email.util.js';
import { baseEmailTemplate } from './base.emai..template.js';

const APP_NAME = process.env.APP_NAME || 'Odoo Rental Platform';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function sendPasswordResetSuccessEmail(
  to: string,
  name: string
): Promise<boolean> {
  const content = `
    <div class="content">
      <h2>Password Reset Successful ✅</h2>
      <p>Hi ${name},</p>
      <p>Your password has been successfully reset.</p>
      <p>You can now log in with your new password.</p>
      <a href="${FRONTEND_URL}/login" class="button">Login Now</a>
      <div class="warning">
        <p><strong>⚠️ Security Notice:</strong> If you didn't make this change, please contact our support team immediately.</p>
      </div>
      <p>Best regards,<br>The ${APP_NAME} Team</p>
    </div>
  `;

  return sendEmail(
    to,
    `Password Reset Successful - ${APP_NAME}`,
    baseEmailTemplate(content)
  );
}
