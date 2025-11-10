import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

export const rateLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

