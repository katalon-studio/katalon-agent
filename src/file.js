const fs = require('fs');
const fse = require('fs-extra');
const http = require('./http');
const logger = require('./logger');
const decompress = require('decompress');
const tmp = require('tmp');

module.exports = {

  downloadAndExtract: function(url, targetDir) {
    logger.info(`Downloading from ${url}. It may take a few minutes.`);
    const file = tmp.fileSync();
    const filePath = file.name;
    return http.stream(url, filePath)
      .then(function() {
        logger.info(`Decompressing the file into ${targetDir}.`);
        return decompress(filePath, targetDir);
      });
  }
}