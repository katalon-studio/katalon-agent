var log4js = require('log4js');

logConfigs = {
    appenders: {
        access: {
            type: "dateFile",
            filename: "log/access.log",
            pattern: "-yyyy-MM-dd",
            category: "http",
        },
        out: { type: "stdout", },
        app: {
            type: "file",
            filename: "log/app.log",
            maxLogSize: 10485760,
            numBackups: 3,
        },
        errorFile: {
            type: "file",
            filename: "log/errors.log",
        },
        errors: {
            type: "logLevelFilter",
            level: "ERROR",
            appender: "errorFile",
        },
    },
    categories: {
        default: { appenders: ["app", "errors", "out"], level: "DEBUG", },
    },
}

log4js.configure(logConfigs);
var logger = log4js.getLogger('katalon');
logger.level = 'all';

 
module.exports = logger;