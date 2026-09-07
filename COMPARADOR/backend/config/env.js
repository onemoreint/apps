import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',

  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5500',

  // Demo Mode
  useDemo: process.env.USE_DEMO === 'true',

  // Cache
  cacheTtl: parseInt(process.env.CACHE_TTL || '3600', 10),
  cacheEnabled: process.env.CACHE_ENABLED !== 'false',

  // Timeouts & Rate Limiting
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '15000', 10),
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),

  // Currency
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'COP',

  // Marketplaces Configuration
  marketplaces: {
    aliexpress: {
      enabled: process.env.ALIEXPRESS_ENABLED === 'true',
      appKey: process.env.ALIEXPRESS_APP_KEY || '',
      appSecret: process.env.ALIEXPRESS_APP_SECRET || '',
      apiUrl: process.env.ALIEXPRESS_API_URL || 'https://api.aliexpress.com',
    },
    shein: {
      enabled: process.env.SHEIN_ENABLED === 'true',
      apiKey: process.env.SHEIN_API_KEY || '',
      apiSecret: process.env.SHEIN_API_SECRET || '',
      apiUrl: process.env.SHEIN_API_URL || 'https://api.shein.com',
    },
    temu: {
      enabled: process.env.TEMU_ENABLED === 'true',
      appKey: process.env.TEMU_APP_KEY || '',
      appSecret: process.env.TEMU_APP_SECRET || '',
      accessToken: process.env.TEMU_ACCESS_TOKEN || '',
      region: process.env.TEMU_REGION || 'US',
      apiUrl: process.env.TEMU_API_URL || 'https://open-api.temu.com',
    },
  },

  // External Services
  currencyConverter: {
    api: process.env.CURRENCY_CONVERTER_API || '',
    key: process.env.CURRENCY_CONVERTER_KEY || '',
  },

  // Proxy
  proxyUrl: process.env.PROXY_URL || null,

  // Security
  secureHeaders: process.env.SECURE_HEADERS !== 'false',
  helmetEnabled: process.env.HELMET_ENABLED !== 'false',

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '14', 10),
  },
};

// Validation
export function validateConfig() {
  if (!config.port || config.port < 1 || config.port > 65535) {
    throw new Error('Invalid PORT configuration');
  }

  if (!config.frontendUrl) {
    throw new Error('FRONTEND_URL is required');
  }

  if (config.isProduction && config.useDemo) {
    console.warn('WARNING: USE_DEMO=true in production environment');
  }

  return config;
}

export default config;
