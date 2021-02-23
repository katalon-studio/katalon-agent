const file = require('../core/file');

class KatalonStudioDownloader {
  constructor(logger, downloadUrl) {
    this.logger = logger;
    this.downloadUrl = downloadUrl;
  }

  download(targetDir) {
    return file.downloadAndExtract(this.downloadUrl, targetDir, false, this.logger);
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
  constructor(logger, gitRepository, cloneOpts = {}) {
    this.logger = logger;
    this.gitRepository = gitRepository;
    this.cloneOpts = cloneOpts;
  }

  download(targetDir) {
    return file.clone(this.gitRepository, targetDir, this.cloneOpts, this.logger);
  }
}


module.exports.KatalonStudioDownloader = KatalonStudioDownloader;
module.exports.KatalonTestProjectDownloader = KatalonTestProjectDownloader;
module.exports.GitDownloader = GitDownloader;
