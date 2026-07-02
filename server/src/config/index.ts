import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://smartdoor:smartdoor123@db:5432/smartdoor',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379/0',

  // MinIO
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'minio:9000',
    accessKey: process.env.MINIO_ACCESS_KEY || 'smartdoor',
    secretKey: process.env.MINIO_SECRET_KEY || 'smartdoor123',
    bucket: process.env.MINIO_BUCKET || 'smartdoor',
    secure: process.env.MINIO_SECURE === 'true',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-in-production',
    expirationHours: parseInt(process.env.JWT_EXPIRATION_HOURS || '24', 10),
  },

  // CORS
  corsOrigins: process.env.CORS_ORIGINS || '*',

  // Storage
  storage: {
    uploadFolder: process.env.UPLOAD_FOLDER || './uploads',
    templateFolder: process.env.TEMPLATE_FOLDER || './templates',
    updateInfoFolder: process.env.UPDATE_INFO_FOLDER || './updates',
    frontendDistFolder: process.env.FRONTEND_DIST_FOLDER || './frontend',
  },

  // Limits
  maxUploadSize: 50 * 1024 * 1024, // 50MB

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
