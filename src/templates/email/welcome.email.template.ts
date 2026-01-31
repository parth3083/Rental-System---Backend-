import 'dotenv/config';
import { sendEmail } from '../../utils/email.util.js';
import { baseEmailTemplate } from './base.emai..template.js';

const APP_NAME = process.env.APP_NAME || 'Odoo Rental Platform';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function sendWelcomeEmail(
  to: string,
  name: string
): Promise<boolean> {
  const content = `
    <div class="content">
      <h2>Welcome to ${APP_NAME}! 🎉</h2>
      <p>Hi ${name},</p>
      <p>Thank you for joining ${APP_NAME}! We're excited to have you on board.</p>
      <p>You can now explore our platform and start your rental journey.</p>
      <a href="${FRONTEND_URL}" class="button">Get Started</a>
      <p>If you have any questions, feel free to reach out to our support team.</p>
      <p>Best regards,<br>The ${APP_NAME} Team</p>
    </div>
  `;

  return sendEmail(to, `Welcome to ${APP_NAME}!`, baseEmailTemplate(content));
}
