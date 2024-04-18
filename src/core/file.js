const decompress = require('decompress');
const childProcess = require('child_process');
const path = require('path');
const simpleGit = require('simple-git')();
const tmp = require('tmp');
const fs = require('fs-extra');

const api = require('./api');
const defaultLogger = require('../config/logger');

function download(downloadMethod, url, logger = defaultLogger, apiKey = null) {
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
  return downloadMethod(url, filePath, apiKey)
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

  downloadFromTestOps(url, targetPath, apiKey, logger = defaultLogger) {
    return download(api.downloadFromTestOps, url, logger, apiKey).then((filePath) =>
      this.move(filePath, targetPath, logger),
    );
  },

  clone(gitRepository, targetDir, downloadDir, cloneOpts = {}, logger = defaultLogger) {
    const { repository, branch, username, password } = gitRepository || {};
    const repoURL = new URL(repository);
    repoURL.username = username;
    repoURL.password = password;
    const url = repoURL.href;

    const dirName = url.split('/').pop();
    const gitDownloadDir = path.join(downloadDir, dirName);
    logger.info(
      `Cloning from ${repository} (${branch}) into ${gitDownloadDir}. It may take a few minutes.`,
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
    if (!targetDir) {
      return simpleGit.clone(url, gitDownloadDir, [
        '--depth',
        '1',
        '--branch',
        actualBranch,
        ...overrideOpts,
      ]);
    }
    const result = childProcess.spawnSync('git',
      [
        'clone',
        '--no-tags',
        '--single-branch',
        '--branch',
        actualBranch,
        '--depth',
        '1',
        '--no-checkout',
        '--sparse',
        url,
        gitDownloadDir,
      ],
      {
        stdio: 'inherit',
      });
    if (result.status !== 0) {
      logger.error(result);
    }
    childProcess.spawnSync('git', ['config', 'core.ignorecase', 'false'], {
      stdio: 'inherit',
      cwd: gitDownloadDir,
    });
    childProcess.spawnSync('git', ['sparse-checkout', 'set', targetDir], {
      stdio: 'inherit',
      cwd: gitDownloadDir,
    });
    childProcess.spawnSync('git', ['checkout', branch], {
      stdio: 'inherit',
      cwd: gitDownloadDir,
    });
    logger.info('Repository cloned successfully with sparse-checkout.');
    return gitDownloadDir;
  },
};
