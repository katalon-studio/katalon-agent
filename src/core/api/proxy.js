const https = require('https');
const _ = require('lodash');
const matchUrl = require('match-url-wildcard');
const config = require('../config');
const logger = require('../../config/logger');

let agent = null;
let agentConfig;

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

// TLS verification is opt-in for legacy configs and enabled in newly created configs.
function getDefaultHttpsAgent() {
  const nextAgentConfig = {
    rejectUnauthorized: false,
    keepAlive: true,
    ...(config.https ? { ...config.https } : {}),
    ...(config.tlsVerify !== undefined ? { rejectUnauthorized: config.tlsVerify } : {}),
  };
  if (!agent || !_.isEqual(agentConfig, nextAgentConfig)) {
    if (agent) {
      agent.destroy();
    }
    agentConfig = nextAgentConfig;
    logger.info('Default HTTPS agent config:', agentConfig);
    agent = new https.Agent(agentConfig);
  }
  return agent;
}

module.exports = {
  getProxy,
  getDefaultHttpsAgent,
};
