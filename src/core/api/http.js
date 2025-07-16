const axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
// const wildcard = require('wildcard');
const { FILTERED_ERROR_CODE } = require('./constants');
const logger = require('../../config/logger');
const { getProxy, getDefaultHttpsAgent } = require('./proxy');
// const config = require('../config');

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

// axios.interceptors.request.use((config1) => {
//   const { proxy, proxyExcludedUrls } = config;
//   const httpAgent = new HttpProxyAgent(proxy, { rejectUnauthorized: false, keepAlive: true });
//   const httpsAgent = new HttpsProxyAgent(proxy, { rejectUnauthorized: false, keepAlive: true });
//   const { url } = config1;
//   if (proxyExcludedUrls) {
//     const excludedUrls = proxyExcludedUrls.split(',');
//     const isExcluded = excludedUrls.some((excludedUrl) => wildcard(excludedUrl, url));
//     if (isExcluded) {
//       return config1;
//     }
//   }
//   // Set the proxy agents for non-excluded URLs
//   if (url.startsWith('http://')) {
//     config1.httpAgent = httpAgent;
//   } else if (url.startsWith('https://')) {
//     config1.httpsAgent = httpsAgent;
//   }
//   return config1;
// });

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
    return this.request('put', urlParam, data, headers);
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

    return this.request('get', urlParam, null, headers, {
      responseType: 'stream',
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
    return axios({
      method,
      url: urlParam.url,
      timeout: 60000,
      params: urlParam.params,
      data,
      headers,
      proxy: getProxy(urlParam.url),
      ...overrideOpts,
      httpsAgent: getDefaultHttpsAgent(),
    });
  },
};
