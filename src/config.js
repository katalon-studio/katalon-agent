'use strict';

var ini = require("ini");
var fs = require("fs");
var _ = require("lodash");
var utils = require("./utils");
var logger = require("./logger");
var path = require('path');

var configFile = path.resolve(process.cwd(), "config.ini");
var global = {};
var init = false;

module.exports = {
  update: function (configs) {
    logger.debug("init config");
    if (!init) {
      if (!this.isConfigFileEmpty()) {
        logger.debug("load config from file", configFile);
        var fileConfigs = ini.parse(fs.readFileSync(configFile, "utf-8"));
        update(_.extend({}, fileConfigs.options, {pathPatterns: _.get(fileConfigs, "paths.path", [])}));
      }
      init = true;
    }
    logger.debug("update config", configs);
    global = _.extend(global, configs);
    for (var p in global) {
      module.exports[p] = global[p];
    }
    logger.debug("current config", global);
  },
  isConfigFileEmpty: function () {
    var empty = true;
    if (fs.existsSync(configFile)) {
      var configs = ini.parse(fs.readFileSync(configFile, "utf-8"));
      empty = _.isEmpty(configs);
    }
    if (empty) {
      logger.debug("config file is empty");
    }
    return empty;
  }
}