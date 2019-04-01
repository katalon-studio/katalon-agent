var request = require('request');
var logger = require('./logger');
var _ = require('lodash');
var fs = require('fs');
var config = require('./config');
const urljoin = require('url-join');

function buildOptions(url, headers, options) {
  const defaultOptions = {
    url: url,
    headers: headers || {},
    strictSSL: false
  };
  const { proxy } = config;
  if (proxy) {
    defaultOptions = {
      ...defaultOptions,
      proxy
    }
  }
  options = _.merge(defaultOptions, options || {});
  return options;
}

module.exports = {

  stream: function(url, filePath) {
    logger.info(`Downloading from ${url} to ${filePath}.`);
    const promise = new Promise((resolve, reject) => {
      const method = 'GET';
      const options = buildOptions(url, {}, {
        method
      });
      request(options)
        .pipe(fs.createWriteStream(filePath))
        .on('finish', () => {
          logger.info('Finished downloading.');
          resolve();
        });
    });
    return promise;
  },

  request: function(baseUrl, relativeUrl, options, method) {
    var headers = {
      'content-type': 'application/json',
      'accept': 'application/json'
    };
    const url = urljoin(baseUrl, relativeUrl);
    options = buildOptions(url, headers, {
      ...options,
      json: true,
      method,
    });
    logger.debug("REQUEST:\n", options);
    var promise = new Promise((resolve, reject) => {
      request(options, (error, response, body) => {
        if (error) {
          logger.error(error);
          reject(error);
        } else {
          logger.info(`${method} ${response.request.href} ${response.statusCode}.`);
          resolve({status: response.statusCode, body: body});
        }
      })
    }).then((response) => {
      response.requestUrl = options.url;
      logger.debug("RESPONSE:\n", response);
      return response
    });
    return promise;
  },

  uploadToS3: function(signedUrl, filePath) {
    var stats = fs.statSync(filePath);
    var headers = {
      'content-type': 'application/octet-stream',
      'accept': 'application/json',
      'Content-Length': stats['size']
    };
    const method = 'PUT';
    const options = buildOptions(signedUrl, headers, {
      method,
      json: true
    });
    var promise = new Promise((resolve, reject) => {
      fs.createReadStream(filePath).pipe(request(options, (error, response, body) => {
        if (error) {
          logger.error(error);
          reject(error);
        } else {
          logger.info(`${method} ${response.request.href} ${response.statusCode}.`);
          resolve({status: response.statusCode, body: body});
        }
      }));
    });
    return promise;
  }

};