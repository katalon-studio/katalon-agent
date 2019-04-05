const _ = require('lodash');
const fs = require('fs');
const fse = require('fs-extra');
const ini = require('ini');
const path = require('path');

const logger = require('./logger');

const configFile = path.resolve(process.cwd(), 'config.ini');
let global = {};

function isConfigFileEmpty() {
  let empty = true;
  if (fs.existsSync(configFile)) {
    const configs = ini.parse(fs.readFileSync(configFile, 'utf-8'));
    empty = _.isEmpty(configs);
  }
  if (empty) {
    logger.debug('config file is empty');
  }
  return empty;
}

// NOTE: ONLY EXPORT FUNCTIONS, DO NOT EXPORT FIELDS
module.exports = {
  update(commandLineConfigs, filepath = configFile) {
    /* Update the module with configs read from both config file and command line */
    // Filter undefined fields
    commandLineConfigs = _.pickBy(commandLineConfigs, value => value !== undefined);
    // Read configs from file
    const fileConfigs = this.read(filepath);
    // Merge both configs
    const configs = _.extend({}, fileConfigs, commandLineConfigs,
      { pathPatterns: _.get(fileConfigs, 'paths.path', []) });

    // Add configs to global and export configs
    global = _.extend(global, configs);
    for (let p in global) {
      module.exports[p] = global[p];
    }
  },

  read(filepath) {
    fse.ensureFileSync(filepath);
    const fp = fse.readFileSync(filepath, 'utf-8');
    return ini.parse(fp);
  },

  write(filepath, configs) {
    // Filter undefined and function fields
    configs = _.pickBy(configs, value => !_.isUndefined(value) && !_.isFunction(value));
    const outputINI = ini.stringify(configs);
    fse.outputFileSync(filepath, outputINI);
  },

  getConfigFile: () => configFile,
};
