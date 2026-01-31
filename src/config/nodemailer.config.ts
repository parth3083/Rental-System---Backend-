import nodemailer from 'nodemailer';

const nodemailerConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT!),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

export const nodemailerTransport = nodemailer.createTransport(nodemailerConfig);
