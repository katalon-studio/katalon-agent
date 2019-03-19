const http = require('./http');
const os = require('./os');
const file = require('./file');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
var _ = require('lodash');

const releasesList = 'https://raw.githubusercontent.com/katalon-studio/katalon-studio/master/releases.json';

module.exports = {

  execute: function(ksVersionNumber, ksLocation, ksProjectPath, ksArgs, x11Display, xvfbConfiguration) {

    return getKsLocation(ksVersionNumber, ksLocation)
      .then(({ ksLocation }) => {
        const osVersion = os.getVersion();
        let ksExecutable = find(ksLocation, /katalon$|katalon\.exe$/);
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
};

function find(startPath, filter, callback){
  if (!fs.existsSync(startPath)){
    return;
  }

  var files=fs.readdirSync(startPath);
  for(var i=0; i < files.length; i++){
    var filename = path.join(startPath, files[i]);
    var stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      const file = find(filename,filter,callback);
      if (!_.isEmpty(file)) {
        return file;
      }
    }
    else if (filter.test(filename)) {
      return filename;
    }
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
              ksLocationParentDir
            });
          }
          else {
            return file.downloadAndExtract(ksVersion.url, ksLocationParentDir)
              .then(() => {
                fs.writeFileSync(katalonDoneFilePath, '');
                resolve({
                  ksLocationParentDir
                });
          }
        });
    }
  });
}
