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
  },

  uploadToS3: function (signedUrl, fileStream) {
    var headers = {
      'content-type': 'multipart/form-data',
      'accept': 'application/json'
    };
    var formData = {
      my_file: fileStream
    }
    var promise = new Promise(function (resolve, reject) {
      
      const options = {
        url: signedUrl,
        json:true,
        headers: headers,
        strictSSL: false,
        formData
      };
      if (config.proxy) {
        options.proxy = config.proxy;
      }
      request['put'](options, function (error, response, body) {
        if (error) {
          logger.error(error);
          reject(error);
        } else {
          logger.info("put " + response.request.href + " " + response.statusCode);
          resolve({status: response.statusCode, body: body});
        }
      })
    });
    return promise;
  }

};