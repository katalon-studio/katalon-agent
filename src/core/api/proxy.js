const config = require('../config');
const logger = require('../../config/logger');

function getProxy() {
  const { proxy } = config;
  if (!proxy) {
    return null;
  }
  try {
    const { protocol, hostname: host, port, username, password } = new URL(proxy);
    let auth;
    if (username || password) {
      auth = {
        username,
        password,
      };
    }
    const proxyInfo = {
      protocol,
      host,
      port,
      auth,
    };
    return proxyInfo;
  } catch (e) {
    logger.error('Unable to setup proxy:', e);
    return null;
  }
}

module.exports = {
  getProxy,
};
