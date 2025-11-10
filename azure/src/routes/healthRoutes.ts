import { Router, Request, Response } from 'express';
import pool from '../config/database';
import { getRedisClient } from '../config/redis';

const router = Router();

router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  // Check database
  try {
    await pool.query('SELECT 1');
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.status = 'degraded';
  }

  // Check Redis
  try {
    const redisClient = await getRedisClient();
    if (redisClient) {
      await redisClient.ping();
      health.services.redis = 'healthy';
    } else {
      health.services.redis = 'disabled';
    }
  } catch (error) {
    health.services.redis = 'unhealthy';
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;



