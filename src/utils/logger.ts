import path from 'path';
import winston from 'winston';
import { LOG_FILE, LOG_LEVEL } from '../config.ts';

const level = LOG_LEVEL.toLowerCase();

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const ext = path.extname(LOG_FILE);
const base = ext ? LOG_FILE.slice(0, -ext.length) : LOG_FILE;
const logFileName = `${base}-${timestamp}${ext || '.log'}`;

const winstonLogger = winston.createLogger({
  level: ['debug', 'info', 'warn', 'error'].includes(level) ? level : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message}${metaStr}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.resolve(process.cwd(), logFileName),
    }),
  ],
});

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    winstonLogger.debug(message, ...args);
  },
  info: (message: string, ...args: unknown[]) => {
    winstonLogger.info(message, ...args);
  },
  warn: (message: string, ...args: unknown[]) => {
    winstonLogger.warn(message, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    winstonLogger.error(message, ...args);
  },
  isDebugEnabled: () => winstonLogger.isLevelEnabled('debug'),
};
