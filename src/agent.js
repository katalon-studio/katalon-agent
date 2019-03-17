const logger = require('./logger');

const agent = {
  start() {
    logger.info('agent start');

    setInterval(() => {
      logger.info(new Date());
    }, 1000);
  },

  stop() {
    logger.info('agent stop');
  }
}

module.exports = agent;