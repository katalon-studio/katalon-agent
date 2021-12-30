const moment = require('moment');
const path = require('path');
const tmp = require('tmp');
const fs = require('fs');
const packageJson = require('../../package.json');

module.exports = {
  getPath(relativePath) {
    if (!global.appRoot) {
      global.appRoot = path.resolve('.');
    }
    return path.join(global.appRoot, relativePath);
  },

  createTempDir(tmpRoot, options) {
    const tmpPrefix = moment(new Date()).format('YYYY.MM.DD-H.m-');
    const tmpDir = tmp.dirSync({
      unsafeCleanup: true,
      keep: true,
      tmpdir: tmpRoot,
      prefix: tmpPrefix,
      ...options,
    });
    return tmpDir;
  },

  stringify(object) {
    return object && Object.keys(object).length > 0 ? JSON.stringify(object, null, 2) : '';
  },

  updateCommand(command, ...options) {
    return options.reduce((cmd, option) => {
      const { flag, value } = option;
      if (cmd.includes(flag)) {
        return cmd;
      }
      if (value) {
        return `${cmd} ${flag}="${value}"`;
      }
      return `${cmd} ${flag}`;
    }, command);
  },

  getVersion() {
    return packageJson.version;
  },

  mergeEnvs(envs) {
    return envs.reduce((merged, { name, value }) => ({ ...merged, [name]: value }), {});
  },

  checkFileExist(ksProjectPath, newTestSuitePath) {
    const currentTestSuitePath = path.join(ksProjectPath, newTestSuitePath);
    const allCurrentFiles = fs.readdirSync(currentTestSuitePath);
    const newFile = newTestSuitePath.split('/').pop();
    for (const file of allCurrentFiles) {
      if (file === newFile) {
        return true;
      }
    }
    return false;
  },
};
