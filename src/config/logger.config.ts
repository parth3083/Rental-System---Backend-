import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  ),
  defaultMeta: { service: 'server' },
  transports: [new winston.transports.Console()],
});
