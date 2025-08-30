const { createLogger, format, transports } = require('winston');

// Fields that should not appear in logs
const SENSITIVE_FIELDS = ['password', 'token'];

// Recursively redact sensitive fields from log info
const redactSensitive = format((info) => {
  const redact = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (SENSITIVE_FIELDS.includes(key)) {
        obj[key] = '[REDACTED]';
      } else if (obj[key] && typeof obj[key] === 'object') {
        redact(obj[key]);
      }
    });
  };

  redact(info);
  return info;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    redactSensitive(),
    format.timestamp(),
    format.json()
  ),
  transports: [new transports.Console()],
});

module.exports = logger;

