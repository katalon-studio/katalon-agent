const decompress = require('decompress');
const tmp = require('tmp');

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
        } else {
          return true;
        }
      },
    });
  },

  downloadAndExtract(url, targetDir, haveFilter, logger = defaultLogger) {
    logger.info(`Downloading from ${url}. It may take a few minutes.`);
    const file = tmp.fileSync();
    const filePath = file.name;
    return http.stream(url, filePath)
      .then(() => this.extract(filePath, targetDir, haveFilter, logger));
  },
};
