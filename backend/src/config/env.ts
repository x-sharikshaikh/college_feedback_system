import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL,
  aiServiceUrl: process.env.AI_SERVICE_URL,
};
