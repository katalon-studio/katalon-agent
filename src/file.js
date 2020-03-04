const decompress = require('decompress');
const nodegit = require('nodegit');
const path = require('path');
const tmp = require('tmp');

const config = require('./config');
const http = require('./http');
const defaultLogger = require('./logger');

module.exports = {
  extract(filePath, targetDir, haveFilter, logger = defaultLogger) {
    logger.info(`Decompressing the ${filePath} into ${targetDir}.`);
    return decompress(filePath, targetDir, {
      filter: (decompressFile) => {
        if (haveFilter) {
          const decompressPath = decompressFile.path;
          return !decompressPath.includes('.git/') && !decompressPath.includes('__MACOSX');
        }
        return true;
      },
    });
  },

  downloadAndExtract(url, targetDir, haveFilter = false, token = null, logger = defaultLogger) {
    logger.info(`Downloading from ${url}. It may take a few minutes.`);
    const file = tmp.fileSync();
    const filePath = file.name;
    logger.debug(`Download into temporary directory: ${filePath}`);
    const options = config.isOnPremise && token ? { auth: { bearer: token } } : {};
    return http
      .stream(url, filePath, options)
      .then(() => this.extract(filePath, targetDir, haveFilter, logger));
  },

  clone(gitRepository, targetDir, cloneOpts = {}, logger = defaultLogger) {
    const {
      repository: url,
      branch: checkoutBranch,
      username,
      password,
    } = gitRepository || {};
    const dirName = url.split('/').pop();
    const gitTargetDir = path.join(targetDir, dirName);
    logger.info(`Cloning from ${url} (${checkoutBranch}) into ${gitTargetDir}. It may take a few minutes.`);

    const cloneOptions = {
      fetchOpts: {
        callbacks: {
          certificateCheck: () => 0,
          credentials: () =>
            nodegit.Cred.userpassPlaintextNew(username, password),
        },
      },
      checkoutBranch: checkoutBranch.split('/').pop(),
      ...cloneOpts,
    };
    return nodegit.Clone(url, gitTargetDir, cloneOptions);
  },
};
