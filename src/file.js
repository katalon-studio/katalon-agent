const fs = require('fs');
const fse = require('fs-extra');
const http = require('http');
const logger = require('./logger');

module.exports = {
  createDirectory: function(path) {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
  },

  removeDirectory: function(path) {
    if (fs.existsSync(path)) {
      fse.removeSync(path);
    }
  },

  downloadAndExtract: function(url, targetDir) {
    logger.info(`Downloading from ${url}. It may take a few minutes.`);
    const file = fs.createWriteStream("file.jpg");
    const request = http.get("http://i3.ytimg.com/vi/J---aiyznGQ/mqdefault.jpg", function(response) {
      response.pipe(file);
    });
  }
}