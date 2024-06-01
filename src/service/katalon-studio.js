/* eslint-disable no-param-reassign */
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const { filter, maxBy } = require('lodash');

const api = require('../core/api');
const defaultLogger = require('../config/logger');
const os = require('../core/os');
const { KatalonStudioDownloader } = require('./remote-downloader');
const utils = require('../core/utils');
const { KRE_LATEST_OPTION_VALUE } = require('../core/api/constants');

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
        // eslint-disable-next-line consistent-return
        return file;
      }
    } else if (filter.test(filename)) {
      // eslint-disable-next-line consistent-return
      return filename;
    }
  }
}

function getKsLocation(ksVersionNumber, ksLocation) {
  if (!ksVersionNumber && !ksLocation) {
    throw new Error("Please specify 'ksVersionNumber' or 'ksLocation'");
  }

  if (ksLocation) {
    return Promise.resolve({
      ksLocationParentDir: ksLocation,
    });
  }

  return api.getKSReleases().then(({ body }) => {
    const osVersion = os.getVersion();
    let ksVersion;

    if (ksVersionNumber === KRE_LATEST_OPTION_VALUE) {
      const kreOsVersions = filter(body, ({ os }) => os === osVersion);
      ksVersion = maxBy(kreOsVersions, 'version');
      ksVersionNumber = ksVersion.version;
    } else {
      ksVersion = body.find((item) => item.version === ksVersionNumber && item.os === osVersion);
    }

    const userhome = os.getUserHome();
    const ksLocationParentDir = path.join(userhome, '.katalon', ksVersionNumber);
    const katalonDoneFilePath = path.join(ksLocationParentDir, '.katalon.done');

    if (fs.existsSync(katalonDoneFilePath)) {
      return { ksLocationParentDir };
    }

    defaultLogger.info(`Download Katalon Studio ${ksVersionNumber} to ${ksLocationParentDir}.`);
    const downloader = new KatalonStudioDownloader(defaultLogger, ksVersion.url);
    return downloader.download(ksLocationParentDir).then((extractedFiles) => {
      if (!extractedFiles || extractedFiles.length <= 0) {
        throw new Error(`Unable to download Katalon Studio ${ksVersionNumber}`);
      }
      fs.writeFileSync(katalonDoneFilePath, '');
      return { ksLocationParentDir };
    });
  });
}

module.exports = {
  execute(
    ksVersionNumber,
    ksLocation,
    ksProjectPath,
    ksArgs,
    x11Display,
    xvfbConfiguration,
    logger = defaultLogger,
    callback = () => { },
    env = {},
  ) {
    return getKsLocation(ksVersionNumber, ksLocation).then(({ ksLocationParentDir }) => {
      logger.info(`Katalon Folder: ${ksLocationParentDir}`);

      if (process.env.IS_DOCKER_AGENT) {
        logger.info(`Check and switch java version for Docker mode to compitable KRE version: ${ksVersionNumber}`);
        utils.switchJavaVersion(ksVersionNumber);
      }

      let ksExecutable =
        find(ksLocationParentDir, /katalonc$|katalonc\.exe$/) ||
        find(ksLocationParentDir, /katalon$|katalon\.exe$/);
      if (!ksExecutable) {
        throw new Error(`Unable to find Katalon Studio executable in ${ksLocationParentDir}`);
      }

      logger.info(`Katalon Executable File: ${ksExecutable}`);

      if (!os.getVersion().includes('Windows')) {
        fs.chmodSync(ksExecutable, '755');
      }

      if (ksExecutable.indexOf(' ') >= 0) {
        ksExecutable = `"${ksExecutable}"`;
      }

      let ksCommand = utils.updateCommand(
        "",
        { flag: '-noSplash' },
        { flag: '-runMode', value: 'console' },
        { flag: '-projectPath', value: ksProjectPath },
      );

      ksCommand = `${ksCommand} ${ksArgs}`;
      const loggingKsCommand = utils.maskLog(ksCommand);
      logger.info(`Execute Katalon Studio: ${ksExecutable} ${loggingKsCommand}`);
      if (logger !== defaultLogger) {
        defaultLogger.debug(`Execute Katalon Studio command: ${ksCommand}`);
      }

      return os.runCommand(ksExecutable, ksCommand, {
        x11Display,
        xvfbConfiguration,
        logger,
        tmpDirPath: '',
        callback,
        env,
      });
    });
  },

  getKsLocation,
};
