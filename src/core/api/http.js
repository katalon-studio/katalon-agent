const axios = require('axios').default;
const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const dns = require('native-dns');
const net = require('net');
const URL = require('url');
const { FILTERED_ERROR_CODE } = require('./constants');
const logger = require('../../config/logger');
const { getProxy, getIgnoreSsl, getDefaultHttpsAgent } = require('./proxy');

const PROGRESS_RENDER_THROTTLE = 5000;

const dnsCache = {};

// Wraps native-dns in a Promise
// we have this exposed in a separate module
function resolveARecord(hostname) {
  return new Promise((resolve, reject) => {
    const question = dns.Question({
      name: hostname,
      type: 'A',
    });
    const request = dns.Request({
      question,
      server: { address: '8.8.8.8', port: 53, type: 'udp' },
      timeout: 5000,
    });
    request.on('timeout', () => {
      if (dnsCache[hostname]) {
        resolve(dnsCache[hostname]);
      } else {
        reject(new Error('Timeout in making request'));
      }
    });
    request.on('message', (err, response) => {
      // Resolve using the first populated A record
      for (const i in response.answer) {
        if (response.answer[i].address) {
          dnsCache[hostname] = response.answer[i];
          resolve(response.answer[i]);
          break;
        }
      }
    });
    request.on('end', () => {
      reject(new Error('Unable to resolve hostname'));
    });
    request.send();
  });
}

axios.interceptors.request.use((config) => {
  const url = URL.parse(config.url);
  if (net.isIP(url.hostname)) {
    // Skip
    return config;
  }
  return resolveARecord(url.hostname).then((response) => {
    config.headers = config.headers || {};
    config.headers.Host = url.hostname; // put original hostname in Host header

    url.hostname = response.address;
    delete url.host; // clear hostname cache
    config.url = URL.format(url);

    return config;
  });
});

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
      proxy: getProxy(),
      ...overrideOpts,
      httpsAgent: getDefaultHttpsAgent(),
    });
  },
};
