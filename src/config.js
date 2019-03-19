const fs = require("fs");
const fse = require("fs-extra");
const ini = require("ini");
const _ = require("lodash");
const path = require('path');

const logger = require("./logger");

var configFile = path.resolve(process.cwd(), "config.ini");
var global = {};

function isConfigFileEmpty() {
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

module.exports = {
  update: function(commandLineConfigs, filepath=configFile) {
    /* Update the module with configs read from both config file and command line */
    // Filter undefined fields
    commandLineConfigs = _.pickBy(commandLineConfigs, (value) => { return value != undefined });
    // Read configs from file
    let fileConfigs = this.read(filepath);
    // Merge both configs
    let configs = _.extend({}, fileConfigs, commandLineConfigs, {pathPatterns: _.get(fileConfigs, "paths.path", [])});

    logger.debug("Update configs: \n", configs);
    // Add configs to global and export configs
    global = _.extend(global, configs);
    for (var p in global) {
      module.exports[p] = global[p];
    }
    logger.debug("Global configs: \n", global);
  },

  read: function(filepath) {
    fse.ensureFileSync(filepath);
    let fp = fse.readFileSync(filepath, "utf-8");
    return ini.parse(fp);
  },

  write: function(filepath, configs) {
    outputINI = ini.stringify(configs);
    fse.outputFileSync(filepath, outputINI);
  },
  
  configFile: configFile,
}