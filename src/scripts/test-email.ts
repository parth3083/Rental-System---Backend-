import { nodemailerTransport } from '../config/nodemailer.config.js';

// Simple email test
async function sendTestEmail() {
  try {
    const info = await nodemailerTransport.sendMail({
      from: '"Test" <test@example.com>',
      to: 'pranshu2908@gmail.com',
      subject: 'Hello from Odoo Rental!',
      text: 'This is a simple test email.',
      html: '<h1>Hello!</h1><p>This is a simple test email from Odoo Rental Platform.</p>',
    });

    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', info.envelope);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
  }
}

sendTestEmail();
