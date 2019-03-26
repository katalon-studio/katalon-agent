const winston = require("winston");

const winstonLogFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp }) => {
        return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    }),
);

var logger = {
    getLogger: function(filename) {
        return winston.createLogger({
            level: 'debug',
            format: winstonLogFormat,
            transports: [
                new winston.transports.Console(),
                new winston.transports.File({ filename: filename }),
            ]
        })
    }
}

module.exports = logger;
