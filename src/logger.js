var log4js = require('log4js');

var logger = log4js.getLogger('katalon');
logger.level = 'info';
module.exports = logger;