'use strict';
var RSVP = require('rsvp');
var utils = require('./utils');
var request = require('request');
var logger = require('./logger');
var _ = require('lodash');
var config = require('./config');

var Promise = RSVP.Promise;

module.exports = {
  makeRequest: function (baseUrl, relativeUrl, options, method) {
    var headers = {
      'content-type': 'application/json',
      'accept': 'application/json'
    };
    var promise = new Promise(function (resolve, reject) {
      options = _.merge(
          {
            url: utils.joinUrl(baseUrl, relativeUrl),
            json:true,
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
  }

};