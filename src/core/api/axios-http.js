const axios = require('axios').default;
const fs = require('fs');
const urljoin = require('url-join');
const { getAuth } = require('../auth');
const { FILTERED_ERROR_CODE } = require('./constants');
const logger = require('../../config/logger');

axios.interceptors.request.use((config) => {
  logger.trace('REQUEST:', config);
  return config;
});

axios.interceptors.response.use(
  (response) => {
    const { data: body, status, statusText, config } = response;
    logger.info(`${config.method} ${config.url} ${status}.`);

    logger.trace('RESPONSE:', {
      body,
      status,
      statusText,
      config,
    });

    const res = {
      status,
      body,
    };
    if (FILTERED_ERROR_CODE.has(res.status)) {
      logger.error(res);
      return Promise.reject(res);
    }
    return res;
  },
  (error) => {
    const err = error.toJSON ? error.toJSON() : error;
    logger.error(err);
    return Promise.reject(err);
  },
);

module.exports = {
  get(apiParam) {
    return this.request('get', apiParam);
  },

  post(apiParam, data) {
    return this.request('post', apiParam, data);
  },

  put(apiParam, data) {
    return this.request('put', apiParam, data);
  },

  patch(apiParam, data) {
    return this.request('patch', apiParam, data);
  },

  uploadFileToS3(apiParam, filePath) {
    const stats = fs.statSync(filePath);
    const headers = {
      'content-type': 'application/octet-stream',
      accept: 'application/json',
      'Content-Length': stats.size,
    };
    const data = fs.createReadStream(filePath);
    const noAuthOpt = { auth: null };
    return this.request('put', apiParam, data, headers, noAuthOpt);
  },

  request(method, apiParam, data = {}, headers = {}, overrideOpts = {}) {
    const auth = getAuth();
    return axios({
      url: urljoin(apiParam.baseUrl || '', apiParam.path || ''),
      method,
      params: apiParam.params,
      data,
      headers,
      auth,
      ...overrideOpts,
    });
  },
};
