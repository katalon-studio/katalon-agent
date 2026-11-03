const _ = require('lodash');
const fse = require('fs-extra');
const ini = require('ini');
const path = require('path');

const configFile = path.resolve(process.cwd(), 'config.ini');

// NOTE: ONLY EXPORT FUNCTIONS, DO NOT EXPORT FIELDS
module.exports = {
  update(commandLineConfigs, filepath = configFile) {
    /* Update the module with configs read from both config file and command line */
    // Filter undefined fields
    commandLineConfigs = _.pickBy(commandLineConfigs, (value) => value !== undefined);
    // Read configs from file
    const fileConfigs = this.read(filepath);
    // Merge both configs
    const configs = {
      // Clear a previous config's TLS setting when loading a legacy config.
      tlsVerify: undefined,
      ...fileConfigs,
      ...commandLineConfigs,
      pathPatterns: _.get(fileConfigs, 'paths.path', []),
    };

    if (configs.tlsVerify === 'true' || configs.tlsVerify === 'false') {
      configs.tlsVerify = configs.tlsVerify === 'true';
    } else if (configs.tlsVerify !== undefined && typeof configs.tlsVerify !== 'boolean') {
      throw new Error('Invalid tlsVerify: expected true or false.');
    }

    // Add configs to global and export configs
    Object.keys(configs).forEach((p) => {
      module.exports[p] = configs[p];
    });
  },

  read(filepath) {
    if (!fse.existsSync(filepath)) {
      // Persist the secure default so the next startup cannot treat this as a legacy config.
      this.write(filepath, { tlsVerify: true });
    }
    const fp = fse.readFileSync(filepath, 'utf-8');
    return ini.parse(fp);
  },

  write(filepath, configs) {
    // Filter undefined and function fields
    configs = _.pickBy(configs, (value) => !_.isUndefined(value) && !_.isFunction(value));
    const outputINI = ini.stringify(configs);
    fse.outputFileSync(filepath, outputINI);
  },

  getConfigFile: () => configFile,
};
