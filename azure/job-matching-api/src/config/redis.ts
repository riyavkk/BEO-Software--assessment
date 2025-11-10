import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient: RedisClientType | null = null;

export const getRedisClient = async (): Promise<RedisClientType | null> => {
  if (process.env.ENABLE_REDIS_CACHE !== 'true') {
    return null;
  }

  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      password: process.env.REDIS_PASSWORD || undefined,
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    await redisClient.connect();
    console.log('✅ Connected to Redis');
    return redisClient;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    return null;
  }
};

export const closeRedisClient = async (): Promise<void> => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
  }
};

