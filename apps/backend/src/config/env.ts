import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3000'), 10),
  databasePath: optional('DATABASE_PATH', './data/cmp.db'),

  keycloak: {
    url: required('KEYCLOAK_URL'),
    realm: required('KEYCLOAK_REALM'),
    clientId: required('KEYCLOAK_CLIENT_ID'),
    clientSecret: required('KEYCLOAK_CLIENT_SECRET'),
  },

  jwt: {
    secret: required('JWT_SECRET'),
  },

  smtp: {
    host: optional('SMTP_HOST', 'localhost'),
    port: parseInt(optional('SMTP_PORT', '1025'), 10),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('SMTP_FROM', 'noreply@fcit-cmp.local'),
  },

  get isDev() {
    return this.nodeEnv === 'development';
  },
  get isProd() {
    return this.nodeEnv === 'production';
  },
} as const;
