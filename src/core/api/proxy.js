const https = require('https');
const wildcard = require('wildcard');
const config = require('../config');
const logger = require('../../config/logger');

const agent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
});

function getProxy(url) {
  const { proxy, proxyExcludedUrls } = config;
  if (!proxy) {
    return false;
  }
  if (proxyExcludedUrls) {
    const excludedUrls = proxyExcludedUrls.split(',');
    const isExcluded = excludedUrls.some((excludedUrl) => wildcard(excludedUrl, url));
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

function getIgnoreSsl() {
  const agent = new https.Agent({
    rejectUnauthorized: false,
  });
  return agent;
}

function getDefaultHttpsAgent() {
  return agent;
}

module.exports = {
  getProxy,
  getIgnoreSsl,
  getDefaultHttpsAgent,
};
