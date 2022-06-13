const decompress = require('decompress');
const path = require('path');
const simpleGit = require('simple-git/promise')();
const tmp = require('tmp');
const fs = require('fs-extra');

const api = require('./api');
const defaultLogger = require('../config/logger');

function download(downloadMethod, url, logger = defaultLogger) {
  logger.info(`Downloading from ${url}. It may take a few minutes.`);
  const file = tmp.fileSync();
  const filePath = file.name;
  logger.debug(`Download into temporary directory: ${filePath}`);
  const verifyDownloadedFile = (res) => {
    const { body } = res;
    if (body && body.filePath) {
      return Promise.resolve(body.filePath);
    }
    return Promise.reject(new Error(`Unable to download from ${url} to ${filePath}`));
  };
  return downloadMethod(url, filePath)
    .then(verifyDownloadedFile);
}

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

  move(filePath, targetPath, logger = defaultLogger) {
    logger.info(`Moving the ${filePath} into ${targetPath}.`);
    fs.copy(filePath, targetPath, (err) => {
      if (err) return logger.error(`Can not move ${filePath} into ${targetPath}`, err);
      return logger.info(`Moved the ${filePath} into ${targetPath}`);
    });
  },

  downloadAndExtract(url, targetDir, haveFilter = false, logger = defaultLogger) {
    return download(api.download, url, logger).then((filePath) =>
      this.extract(filePath, targetDir, haveFilter, logger),
    );
  },

  downloadAndExtractFromTestOps(url, targetDir, haveFilter = false, logger = defaultLogger) {
    return download(api.downloadFromTestOps, url, logger).then((filePath) =>
      this.extract(filePath, targetDir, haveFilter, logger),
    );
  },

  downloadFromTestOps(url, targetPath, logger = defaultLogger) {
    return download(api.downloadFromTestOps, url, logger).then((filePath) =>
      this.move(filePath, targetPath, logger),
    );
  },

  clone(gitRepository, targetDir, cloneOpts = {}, logger = defaultLogger) {
    const { repository, branch, username, password } = gitRepository || {};

    const repoURL = new URL(repository);
    repoURL.username = username;
    repoURL.password = password;
    const url = repoURL.href;

    const dirName = url.split('/').pop();
    const gitTargetDir = path.join(targetDir, dirName);
    logger.info(
      `Cloning from ${repository} (${branch}) into ${gitTargetDir}. It may take a few minutes.`,
    );

    const overrideOpts = Object.entries(cloneOpts).reduce((opts, [k, v]) => {
      opts.push(k);
      if (v) {
        opts.push(v);
      }
      return opts;
    }, []);

    let actualBranch = '';
    const refsHeads = 'refs/heads/';

    if (branch.startsWith(refsHeads)) {
      actualBranch = branch.replace(refsHeads, '');
    } else {
      actualBranch = branch.split('/').pop();
    }

    return simpleGit.clone(url, gitTargetDir, [
      '--depth',
      '1',
      '--branch',
      actualBranch,
      ...overrideOpts,
    ]);
  },
};
