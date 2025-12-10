const fs = require('fs-extra');
const path = require('path');
const file = require('../core/file');

const KATALON_STUDIO_ENGINE_PREFIX = 'Katalon_Studio_Engine_';
const KRE_FOLDER_NAME = 'kre';

class KatalonStudioDownloader {
  constructor(logger, downloadUrl) {
    this.logger = logger;
    this.downloadUrl = downloadUrl;
  }

  download(targetDir) {
    return file.downloadAndExtract(this.downloadUrl, targetDir, false, this.logger)
      .then((extractedFiles) => {
        if (extractedFiles && extractedFiles.length > 0) {
          const firstFilePath = extractedFiles[0].path;
          const rootFolder = firstFilePath.split(path.sep)[0];

          if (rootFolder && rootFolder.startsWith(KATALON_STUDIO_ENGINE_PREFIX)) {
            const oldPath = path.join(targetDir, rootFolder);
            const newPath = path.join(targetDir, KRE_FOLDER_NAME);

            if (fs.existsSync(oldPath)) {
              this.logger.info(`Renaming ${rootFolder} to ${KRE_FOLDER_NAME}`);
              fs.renameSync(oldPath, newPath);
            }
          }
        }
        return extractedFiles;
      });
  }
}

class KatalonTestProjectDownloader {
  constructor(logger, downloadUrl) {
    this.logger = logger;
    this.downloadUrl = downloadUrl;
  }

  download(targetDir) {
    return file.downloadAndExtractFromTestOps(this.downloadUrl, targetDir, true, this.logger);
  }
}

class GitDownloader {
  constructor(logger, gitRepository, targetDirectory, cloneOpts = {}) {
    this.logger = logger;
    this.gitRepository = gitRepository;
    this.cloneOpts = cloneOpts;
    this.targetDirectory = targetDirectory;
  }

  download(downloadDir) {
    return file.clone(this.gitRepository, this.targetDirectory, downloadDir, this.cloneOpts, this.logger);
  }
}

module.exports.KatalonStudioDownloader = KatalonStudioDownloader;
module.exports.KatalonTestProjectDownloader = KatalonTestProjectDownloader;
module.exports.GitDownloader = GitDownloader;
