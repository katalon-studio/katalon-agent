const axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const { getAuth } = require('../auth');
const { FILTERED_ERROR_CODE } = require('./constants');
const logger = require('../../config/logger');

const PROGRESS_RENDER_THROTTLE = 5000;

axios.interceptors.request.use((config) => {
  logger.trace('REQUEST:', config);
  return config;
});

axios.interceptors.response.use(
  (response) => {
    const { data: body, status, statusText, config, headers } = response;
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
      headers,
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
  get(urlParam) {
    return this.request('get', urlParam);
  },

  post(urlParam, data) {
    return this.request('post', urlParam, data);
  },

  put(urlParam, data) {
    return this.request('put', urlParam, data);
  },

  patch(urlParam, data) {
    return this.request('patch', urlParam, data);
  },

  uploadFileToS3(urlParam, filePath) {
    const stats = fs.statSync(filePath);
    const headers = {
      'content-type': 'application/octet-stream',
      accept: 'application/json',
      'Content-Length': stats.size,
    };
    const data = fs.createReadStream(filePath);
    const noAuthOpt = { auth: null };
    return this.request('put', urlParam, data, headers, noAuthOpt);
  },

  stream(urlParam, filePath) {
    logger.info(`Downloading from ${urlParam.url} to ${filePath}.`);

    const fileName = path.basename(filePath);
    const format = `\t ${fileName}\t :percent[:bar]\t :currentB (:rateB/s) | Elapsed: :elapseds | ETA: :etas`;
    const progressOpts = {
      complete: '=',
      incomplete: ' ',
      width: 20,
      renderThrottle: PROGRESS_RENDER_THROTTLE,
    };

    // TODO: handle auth for onpremise download
    return this.request('get', urlParam, null, null, {
      auth: null,
      responseType: 'stream',
    }).then((res) => {
      if (res.body) {
        const readableStream = res.body;
        const total = parseInt(res.headers['content-length'], 10) || 1;
        const opts = {
          ...progressOpts,
          total,
        };

        const bar = new ProgressBar(format, opts);

        readableStream.on('data', (chunk) => {
          bar.tick(chunk.length);
        });
        return new Promise((resolve) => {
          readableStream.pipe(fs.createWriteStream(filePath)).on('finish', () => {
            logger.info('Finished downloading.');
            resolve(filePath);
          });
        });
      }
      return null;
    });
  },

  request(method, urlParam, data = {}, headers = {}, overrideOpts = {}) {
    const auth = getAuth();
    return axios({
      method,
      url: urlParam.url,
      params: urlParam.params,
      data,
      headers,
      auth,
      ...overrideOpts,
    });
  },
};
