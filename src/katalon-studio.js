const http = require('./http');
const os = require('./os');
const file = require('./file');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const releasesList = 'https://raw.githubusercontent.com/katalon-studio/katalon-studio/master/releases.json';

module.exports = {

  execute: function(ksVersionNumber, ksLocation, ksProjectPath, ksArgs, x11Display, xvfbConfiguration) {

    return getKsLocation(ksVersionNumber, ksLocation)
      .then(({ ksLocation }) => {
        const osVersion = os.getVersion();
        let ksExecutable;
        if (osVersion.indexOf('macOS') >= 0) {
          ksExecutable = path.join(ksLocation, 'Contents', 'MacOS', 'katalon');
        } else {
          ksExecutable = path.join(ksLocation, 'katalon');
        }
        if (!fs.existsSync(ksExecutable)) {
          ksExecutable += '.exe';
        }
        fs.chmodSync(ksExecutable, '755');
        if (ksExecutable.indexOf(' ') >= 0) {
          ksExecutable = `"${ksExecutable}"`;
        }
        let ksCommand = `${ksExecutable} -noSplash -runMode=console`;
        if (ksArgs.indexOf('-projectPath') < 0) {
            ksCommand = `${ksCommand} -projectPath="${ksProjectPath}"`;
        }
        ksCommand = `${ksCommand} ${ksArgs}`;
        logger.info(`Execute Katalon Studio: ${ksCommand}`);
        return os.runCommand(ksCommand, x11Display, xvfbConfiguration);
      });
  }
}

function getKsLocation(ksVersionNumber, ksLocation) {
  return new Promise((resolve) => {
    if (ksLocation) {
      resolve({
        ksLocation
      });
    } else {
      return http.request(releasesList, '', {}, 'GET')
        .then(({ body }) => {
          const osVersion = os.getVersion();
          const ksVersion = body.find((item) => {
            return item.version == ksVersionNumber && item.os == osVersion;
          });
          const fileName = ksVersion.filename;
          let fileExtension;
          if (fileName.endsWith('.zip')) {
            fileExtension = '.zip';
          }
          else if (fileName.endsWith('.tar.gz')) {
            fileExtension = ".tar.gz";
          }
          else {
            throw `Unexpected file name ${fileName}`;
          }
          const ksLocationDirName = fileName.replace(fileExtension, '');
          const userhome = os.getUserhome();
          const ksLocationParentDir = path.join(userhome, '.katalon', ksVersionNumber);
          const katalonDoneFilePath = path.join(ksLocationParentDir, '.katalon.done');
          const ksLocation = path.join(ksLocationParentDir, ksLocationDirName);
          if (fs.existsSync(katalonDoneFilePath)) {
            resolve({
              ksLocation
            });
          }
          else {
            return file.downloadAndExtract(ksVersion.url, ksLocationParentDir)
              .then(() => {
                fs.writeFileSync(katalonDoneFilePath, '');
                return {
                  ksLocation
                };
              });
          }
        });
    }
  });
}
