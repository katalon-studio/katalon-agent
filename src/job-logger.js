const winston = require('winston');

const winstonLogFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.printf(({ level, message, timestamp }) => `[${timestamp}] [${level.toUpperCase()}]: ${message}`),
);

const logger = {
  getLogger(filename) {
    return winston.createLogger({
      level: 'debug',
      format: winstonLogFormat,
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename }),
      ],
    });
  },
};

module.exports = logger;
