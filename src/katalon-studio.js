const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const file = require('./file');
const http = require('./http');
const defaultLogger = require('./logger');
const os = require('./os');

const releasesList = 'https://raw.githubusercontent.com/katalon-studio/katalon-studio/master/releases.json';

function find(startPath, filter, callback) {
  if (!fs.existsSync(startPath)) {
    return;
  }

  const files = fs.readdirSync(startPath);
  for (let i = 0; i < files.length; i += 1) {
    const filename = path.join(startPath, files[i]);
    const stat = fs.lstatSync(filename);
    if (stat.isDirectory()) {
      const file = find(filename, filter, callback);
      if (!_.isEmpty(file)) {
        return file;
      }
    } else if (filter.test(filename)) {
      return filename;
    }
  }
}

function getKsLocation(ksVersionNumber, ksLocation) {
  if (!ksVersionNumber && !ksLocation) {
    defaultLogger.error("Please specify 'ksVersionNumber' or 'ksLocation'");
  }

  if (ksLocation) {
    return Promise.resolve({
      ksLocationParentDir: ksLocation,
    });
  }

  return http.request(releasesList, '', {}, 'GET')
    .then(({ body }) => {
      const osVersion = os.getVersion();
      const ksVersion = body.find(item => item.version === ksVersionNumber
        && item.os === osVersion);
      const fileName = ksVersion.filename;
      let fileExtension;
      if (fileName.endsWith('.zip')) {
        fileExtension = '.zip';
      } else if (fileName.endsWith('.tar.gz')) {
        fileExtension = '.tar.gz';
      } else {
        throw `Unexpected file name ${fileName}`;
      }
      const userhome = os.getUserHome();
      const ksLocationParentDir = path.join(userhome, '.katalon', ksVersionNumber);
      const katalonDoneFilePath = path.join(ksLocationParentDir, '.katalon.done');

      const ksLocationDirName = fileName.replace(fileExtension, '');
      const ksLocation = path.join(ksLocationParentDir, ksLocationDirName);

      if (fs.existsSync(katalonDoneFilePath)) {
        return Promise.resolve({ ksLocationParentDir });
      }

      defaultLogger.info(`Download Katalon Studio ${ksVersionNumber} to ${ksLocationParentDir}.`);
      return file.downloadAndExtract(ksVersion.url, ksLocationParentDir)
        .then(() => {
          fs.writeFileSync(katalonDoneFilePath, '');
          return Promise.resolve({ ksLocationParentDir });
        });
    });
}

module.exports = {

  execute(ksVersionNumber, ksLocation, ksProjectPath, ksArgs,
    x11Display, xvfbConfiguration, logger = defaultLogger) {
    return getKsLocation(ksVersionNumber, ksLocation)
      .then(({ ksLocationParentDir }) => {
        logger.info(`Katalon Folder: ${ksLocationParentDir}`);
        let ksExecutable = find(ksLocationParentDir, /katalon$|katalon\.exe$/);
        logger.info(`Katalon Executable File: ${ksExecutable}`);
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
        if (logger !== defaultLogger) {
          defaultLogger.debug(`Execute Katalon Studio command: ${ksCommand}`);
        }
        return os.runCommand(ksCommand, x11Display, xvfbConfiguration, logger);
      });
  },

  getKsLocation,
};
