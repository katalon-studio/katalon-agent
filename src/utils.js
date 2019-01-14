'use strict';

var fs = require('fs');
var fse = require('fs-extra');
var util = require('util');
var _ = require('lodash');

module.exports = {
  createDirectory: function (path) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
  },
  removeDirectory: function (path) {
    if (fs.existsSync(path)) {
      fse.removeSync(path);
    }
  },
  format: function () {
    return util.format.apply(util, arguments);
  },
  joinUrl: function () {
    var urls = _.map(arguments, function (path) {
      return _.trimStart(_.trimEnd(_.trim(path), "/"), "/");
    });
    return _.join(urls, "/");
  }
};