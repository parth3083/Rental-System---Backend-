import { nodemailerTransport } from '../config/nodemailer.config.js';
import { logger } from '../config/logger.config.js';

const APP_NAME = process.env.APP_NAME || 'Odoo Rental Platform';

/**
 * Send a general email
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const fromEmail =
      process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@app.com';

    const info = await nodemailerTransport.sendMail({
      from: `"${APP_NAME}" <${fromEmail}>`,
      to,
      subject,
      html,
    });

    logger.info(`Email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}
