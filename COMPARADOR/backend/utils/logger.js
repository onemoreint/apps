import config from '../config/env.js';

const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const LOG_LEVEL_COLOR = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m', // Yellow
  info: '\x1b[36m', // Cyan
  debug: '\x1b[35m', // Magenta
};

const RESET_COLOR = '\x1b[0m';

class Logger {
  constructor(context = 'App') {
    this.context = context;
    this.currentLevel = LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;
  }

  /**
   * Format log message with timestamp and context
   */
  _format(level, message, data) {
    const timestamp = new Date().toISOString();
    const color = LOG_LEVEL_COLOR[level] || '';
    const levelStr = level.toUpperCase().padEnd(5);

    let output = `${color}[${timestamp}] [${levelStr}] [${this.context}]${RESET_COLOR}`;

    if (typeof message === 'string') {
      output += ` ${message}`;
    }

    if (data && Object.keys(data).length > 0) {
      output += ` ${JSON.stringify(data)}`;
    }

    return output;
  }

  /**
   * Never log sensitive data
   */
  _sanitize(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'apiKey',
      'appSecret',
      'accessToken',
      'authorization',
      'apiSecret',
      'appSecret',
      'credentials',
    ];

    const sanitized = { ...data };

    for (const key in sanitized) {
      if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  /**
   * Log error messages
   */
  error(message, data = null) {
    if (LOG_LEVELS.error <= this.currentLevel) {
      console.error(this._format('error', message, this._sanitize(data)));
    }
  }

  /**
   * Log warning messages
   */
  warn(message, data = null) {
    if (LOG_LEVELS.warn <= this.currentLevel) {
      console.warn(this._format('warn', message, this._sanitize(data)));
    }
  }

  /**
   * Log info messages
   */
  info(message, data = null) {
    if (LOG_LEVELS.info <= this.currentLevel) {
      console.log(this._format('info', message, this._sanitize(data)));
    }
  }

  /**
   * Log debug messages
   */
  debug(message, data = null) {
    if (LOG_LEVELS.debug <= this.currentLevel) {
      console.log(this._format('debug', message, this._sanitize(data)));
    }
  }

  /**
   * Create child logger with different context
   */
  child(context) {
    return new Logger(context);
  }
}

export default new Logger('PriceMatch');
