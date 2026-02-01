import 'dotenv/config';
import { sendEmail } from '../../utils/email.util.js';
import { baseEmailTemplate } from './base.emai..template.js';

const APP_NAME = process.env.APP_NAME || 'Odoo Rental Platform';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function sendQuotationEmail(
  to: string,
  customerName: string,
  quotationNumber: string,
  orderId: string
): Promise<boolean> {
  const quotationLink = `${FRONTEND_URL}/customer/orders/${orderId}`; // Assuming customer view link

  const content = `
    <div class="content">
      <h2>Quotation Sent 📄</h2>
      <p>Hi ${customerName},</p>
      <p>A new quotation (Ref: <strong>${quotationNumber}</strong>) has been sent to you from ${APP_NAME}.</p>
      <p>You can review the quotation details and take action by clicking the button below:</p>
      <a href="${quotationLink}" class="button">View Quotation</a>
      <p>If you have any questions, feel free to reply to this email.</p>
      <p>Best regards,<br>The ${APP_NAME} Team</p>
    </div>
  `;

  return sendEmail(
    to,
    `New Quotation Received - ${quotationNumber}`,
    baseEmailTemplate(content)
  );
}
