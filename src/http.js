const _ = require('lodash');
const fs = require('fs');
const request = require('request');
const urljoin = require('url-join');

const { Readable } = require('stream');
const logger = require('./logger');
const config = require('./config');

const FILTERED_ERROR_CODE = new Set([400, 401, 403, 404, 500, 502, 503, 504]);

function buildOptions(url, headers, options) {
  let defaultOptions = {
    url,
    headers: headers || {},
    strictSSL: false,
  };
  const { proxy } = config;
  if (proxy) {
    defaultOptions = {
      ...defaultOptions,
      proxy,
    };
  }
  options = _.merge(defaultOptions, options || {});
  return options;
}

module.exports = {
  stream(url, filePath, opts = {}) {
    logger.info(`Downloading from ${url} to ${filePath}.`);
    const promise = new Promise((resolve) => {
      const method = 'GET';
      const options = buildOptions(
        url,
        {},
        {
          ...opts,
          method,
        },
      );
      request(options)
        .pipe(fs.createWriteStream(filePath))
        .on('finish', () => {
          logger.info('Finished downloading.');
          resolve();
        });
    });
    return promise;
  },

  request(baseUrl, relativeUrl, options, method) {
    const headers = {
      'content-type': 'application/json',
      accept: 'application/json',
    };
    const url = urljoin(baseUrl, relativeUrl);
    options = buildOptions(url, headers, {
      ...options,
      json: true,
      method,
    });
    logger.trace('REQUEST:\n', options);
    const promise = new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        if (error) {
          logger.error(error);
          reject(error);
        } else {
          logger.info(`${method} ${response.request.href} ${response.statusCode}.`);

          const res = { status: response.statusCode, body };
          if ((body && body.error) || FILTERED_ERROR_CODE.has(res.status)) {
            logger.error(res);
            reject(res);
          }
          resolve(res);
        }
      });
    }).then((response) => {
      response.requestUrl = options.url;
      logger.trace('RESPONSE:\n', response);
      return response;
    });
    return promise;
  },

  uploadToS3(signedUrl, filePath) {
    const stats = fs.statSync(filePath);
    const headers = {
      'content-type': 'application/octet-stream',
      accept: 'application/json',
      'Content-Length': stats.size,
    };
    const method = 'PUT';
    const options = buildOptions(signedUrl, headers, {
      method,
      json: true,
    });
    const promise = new Promise((resolve, reject) => {
      fs.createReadStream(filePath).pipe(
        request(options, (error, response, body) => {
          if (error) {
            logger.error(error);
            reject(error);
          } else {
            logger.info(`${method} ${response.request.href} ${response.statusCode}.`);
            resolve({ status: response.statusCode, body });
          }
        }),
      );
    });
    return promise;
  },

  streamToS3(signedUrl, content) {
    const headers = {
      'content-type': 'application/octet-stream',
      'Content-Length': content.length,
    };
    const method = 'PUT';
    const options = buildOptions(signedUrl, headers, {
      method,
      json: true,
    });

    const strStream = new Readable();
    strStream.push(content);
    strStream.push(null);

    const promise = new Promise((resolve, reject) => {
      strStream.pipe(
        request(options, (error, response, body) => {
          if (error) {
            logger.error(error);
            reject(error);
          } else {
            logger.info(`${method} ${response.request.href} ${response.statusCode}.`);
            resolve({ status: response.statusCode, body });
          }
        }),
      );
    });
    return promise;
  },
};
