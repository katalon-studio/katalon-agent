const http = require('./http');
const os = require('./os');
const file = require('./file');
const path = require('path');
const fs = require('fs');

const releasesList = 'https://raw.githubusercontent.com/katalon-studio/katalon-studio/master/releases.json';

module.exports = {

  execute: function() {
    const ksVersionNumber = '5.10.1';
    return http.request(releasesList, '', {}, 'GET')
      .then(function({ body }) {

        const osVersion = os.getVersion();
        const ksVersion = body.find(function(item) {
          return item.version == ksVersionNumber && item.os == osVersion;
        });

        const fileName = ksVersion.filename;
        let fileExtension;
        if (fileName.endsWith('.zip')) {
          fileExtension = '.zip';
        } else if (fileName.endsWith('.tar.gz')) {
          fileExtension = ".tar.gz";
        } else {
          throw `Unexpected file name ${fileName}`;
        }
        const containingDirName = fileName.replace(fileExtension, '');

        const userhome = os.getUserhome();
        const containingDirPath = path.join(userhome, '.katalon', ksVersionNumber);
        return file.downloadAndExtract(ksVersion.url, containingDirPath)
          .then(function() {
            const katalonDoneFilePath = path.join(containingDirPath, '.katalon.done');
            fs.writeFileSync(katalonDoneFilePath, '');
          });
      });
  }
}