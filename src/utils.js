const moment = require('moment');
const path = require('path');
const tmp = require('tmp');

module.exports = {
  getPath(relativePath) {
    return path.join(global.appRoot, relativePath);
  },

  createTempDir(tmpRoot, options) {
    const tmpPrefix = moment(new Date()).format('YYYY.MM.DD-H.m-');
    const tmpDir = tmp.dirSync({
      unsafeCleanup: true,
      keep: true,
      dir: tmpRoot,
      prefix: tmpPrefix,
      ...options,
    });
    return tmpDir;
  },
};
