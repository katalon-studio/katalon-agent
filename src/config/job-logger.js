const winston = require('winston');
const momentTimeZone = require('moment-timezone');
const { stringify } = require('../core/utils');

const DATE_FORMAT_WITH_TIMEZONE = 'MM/DD/YYYY HH:mm:ss Z';
let timezone = '';

function formatter({ level, message, timestamp, metadata }) {
  const metaStr = `${metadata.stack || stringify(metadata)}`;
  return `[${timestamp}] [${level.toUpperCase()}]: ${message}${metaStr && `\n${metaStr}`}`;
}

function formatDate() {
  return momentTimeZone(new Date()).tz(timezone).format(DATE_FORMAT_WITH_TIMEZONE);
}

const winstonLogFormat = winston.format.combine(
  winston.format.align(),
  winston.format.splat(),
  winston.format.metadata(),
  winston.format.timestamp({ format: formatDate }),
  winston.format.printf(formatter),
);

const logger = {
  getLogger(filename, projectTimeZone) {
    timezone = projectTimeZone;

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
