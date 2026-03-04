import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.APP_PORT || '3000', 10),
  secret: process.env.APP_SECRET || 'default-secret',
}));

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  name: process.env.DB_NAME || 'ai_project_mgmt',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret',
  accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
  refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
}));

export const aiConfig = registerAs('ai', () => ({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.AI_MODEL || 'claude-opus-4-20250514',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
}));