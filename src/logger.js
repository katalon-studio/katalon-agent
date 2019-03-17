var log4js = require('log4js');

// log4js.configure('./config/log-config.json');
var logger = log4js.getLogger('katalon');
logger.level = 'all';

 
module.exports = logger;