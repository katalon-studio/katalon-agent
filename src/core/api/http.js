const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
// const wildcard = require('wildcard');
const { FILTERED_ERROR_CODE } = require('./constants');
const logger = require('../../config/logger');
const { getProxy, createHttpsAgent } = require('./proxy');
// const config = require('../config');

const PROGRESS_RENDER_THROTTLE = 5000;

const streamAxiosInstance = axios.create({
  timeout: 120000,
  httpsAgent: createHttpsAgent(),
});

const regularAxiosInstance = axios.create({
  timeout: 120000,
  httpsAgent: createHttpsAgent(),
});

regularAxiosInstance.interceptors.request.use((config) => {
  logger.trace('REQUEST:', config);
  return config;
});

regularAxiosInstance.interceptors.response.use(
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
    if (error.response) {
      logger.error('Response data:', error.response.data);
    } else if (error.request) {
      logger.error('No response received:', error.request);
    } else {
      logger.error('Error setting up request:', error.message, error.stack, error.config);
    }
    return Promise.reject(err);
  },
);

streamAxiosInstance.interceptors.request.use((config) => {
  logger.trace('REQUEST:', config);
  return config;
});

streamAxiosInstance.interceptors.response.use(
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
    if (error.response) {
      logger.error('Response data:', error.response.data);
    } else if (error.request) {
      logger.error('No response received:', error.request);
    } else {
      logger.error('Error setting up request:', error.message, error.stack, error.config);
    }
    return Promise.reject(err);
  },
);

module.exports = {
  get(urlParam, headers) {
    return this.request('get', urlParam, null, headers);
  },

  post(urlParam, data, headers) {
    return this.request('post', urlParam, data, headers);
  },

  put(urlParam, data, headers) {
    return this.request('put', urlParam, data, headers);
  },

  patch(urlParam, data, headers) {
    return this.request('patch', urlParam, data, headers);
  },

  uploadFileToS3(urlParam, filePath) {
    const stats = fs.statSync(filePath);
    const headers = {
      'content-type': 'application/octet-stream',
      accept: 'application/json',
      'Content-Length': stats.size,
    };
    const data = fs.createReadStream(filePath);
    return this.streamingRequest('put', urlParam, data, headers);
  },

  stream(urlParam, filePath, headers) {
    logger.info(`Downloading from ${urlParam.url} to ${filePath}.`);

    const fileName = path.basename(filePath);
    const format = `\t ${fileName}\t :percent[:bar]\t :currentB (:rateB/s) | Elapsed: :elapseds | ETA: :etas`;
    const progressOpts = {
      complete: '=',
      incomplete: ' ',
      width: 20,
      renderThrottle: PROGRESS_RENDER_THROTTLE,
    };

    return this.streamingRequest('get', urlParam, null, headers, {
      responseType: 'stream',
      timeout: 3600000,
    }).then(({ status, body, headers }) => {
      if (body) {
        const readableStream = body;
        const total = parseInt(headers['content-length'], 10) || 1;
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
            resolve({
              status,
              body: {
                filePath,
                stat: fs.statSync(filePath),
              },
            });
          });
        });
      }
      return {
        status,
        body,
      };
    });
  },

  request(method, urlParam, data = {}, headers = {}, overrideOpts = {}) {
    return regularAxiosInstance({
      method,
      url: urlParam.url,
      params: urlParam.params,
      data,
      headers,
      proxy: getProxy(urlParam.url),
      ...overrideOpts,
    });
  },

  streamingRequest(method, urlParam, data = {}, headers = {}, overrideOpts = {}) {
    return streamAxiosInstance({
      method,
      url: urlParam.url,
      params: urlParam.params,
      data,
      headers,
      proxy: getProxy(urlParam.url),
      ...overrideOpts,
    });
  },
};
