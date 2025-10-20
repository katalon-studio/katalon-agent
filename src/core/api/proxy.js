const https = require('https');
const matchUrl = require('match-url-wildcard');
const config = require('../config');
const logger = require('../../config/logger');

let agent = null;

function getProxy(url) {
  const { proxy, proxyExcludeList } = config;
  if (!proxy) {
    return false;
  }
  if (proxyExcludeList) {
    const excludedUrls = proxyExcludeList.split(',');
    const isExcluded = excludedUrls.some((excludedUrl) => matchUrl(url, excludedUrl));
    if (isExcluded) {
      return false;
    }
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
    return false;
  }
}

// function getIgnoreSsl() {
//   const agent = new https.Agent({
//     rejectUnauthorized: false,
//   });
//   return agent;
// }

function getDefaultHttpsAgent() {
  if (!agent) {
    const agentConfig = {
      rejectUnauthorized: true,
      keepAlive: true,
      ...(config.https ? { ...config.https } : {}),
    };
    logger.info('Default HTTPS agent config:', agentConfig);
    agent = new https.Agent(agentConfig);
  }
  return agent;
}

module.exports = {
  getProxy,
  // getIgnoreSsl,
  getDefaultHttpsAgent,
};
