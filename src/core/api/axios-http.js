const axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const urljoin = require('url-join');
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

  stream(url, filePath) {
    logger.info(`Downloading from ${url} to ${filePath}.`);

    const fileName = path.basename(filePath);
    const format = `\t ${fileName}\t :percent[:bar]\t :currentB (:rateB/s) | Elapsed: :elapseds | ETA: :etas`;
    const progressOpts = {
      complete: '=',
      incomplete: ' ',
      width: 20,
      renderThrottle: PROGRESS_RENDER_THROTTLE,
    };

    return this.request(
      'get',
      {
        baseUrl: url,
      },
      null,
      null,
      {
        auth: null,
        responseType: 'stream',
      },
    ).then((res) => {
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
