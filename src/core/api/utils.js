const urljoin = require('url-join');
const config = require('../config');
const { TESTOPS_BASE_URL } = require('./constants');

function buildUrl({ params = {}, baseUrl = config.serverUrl || TESTOPS_BASE_URL }, ...paths) {
  const url = urljoin(baseUrl, ...paths.map((p) => p.toString()));
  return {
    url,
    params,
  };
}

function getBasicAuthHeader({ username = '', password = '' }) {
  const base64 = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
  return `Basic ${base64}`;
}

module.exports = {
  buildUrl,
  getBasicAuthHeader,
};
