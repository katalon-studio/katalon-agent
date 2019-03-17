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
  if (config.proxy) {
    defaultOptions.proxy = config.proxy;
  }
  options = _.merge(defaultOptions, options || {});
  return options;
}

module.exports = {

  stream: function(url) {
    var promise = new Promise(function (resolve, reject) {
      const options = buildOptions(url);
      request[method](options, function (error, response, body) {
        if (error) {
          logger.error(error);
          reject(error);
        } else {
          logger.info(method + " " + response.request.href + " " + response.statusCode);
          resolve({status: response.statusCode, body: body});
        }
      })
    });
    return promise;
  },

  request: function(baseUrl, relativeUrl, options, method) {
    var headers = {
      'content-type': 'application/json',
      'accept': 'application/json'
    };
    var promise = new Promise(function (resolve, reject) {
      options = _.merge(
          {
            url: urljoin(baseUrl, relativeUrl),
            json: true,
            headers: headers,
            strictSSL: false
          },
          options);
      if (config.proxy) {
        options.proxy = config.proxy;
      }
      request[method](options, function (error, response, body) {
        if (error) {
          logger.error(error);
          reject(error);
        } else {
          logger.info(method + " " + response.request.href + " " + response.statusCode);
          resolve({status: response.statusCode, body: body});
        }
      })
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
    var promise = new Promise(function (resolve, reject) {

      const options = {
        url: signedUrl,
        method: 'PUT',
        json: true,
        headers: headers,
        strictSSL: false,
      };
      if (config.proxy) {
        options.proxy = config.proxy;
      }
      fs.createReadStream(filePath).pipe(request(options, function (error, response, body) {
        if (error) {
          logger.error(error);
          reject(error);
        } else {
          logger.info("put " + response.request.href + " " + response.statusCode);
          resolve({status: response.statusCode, body: body});
        }
      }));
    });
    return promise;
  }

};