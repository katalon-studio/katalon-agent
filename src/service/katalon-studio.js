/* eslint-disable no-param-reassign */
const _ = require('lodash');
const fs = require('fs');
const path = require('path');

const api = require('../core/api');
const defaultLogger = require('../config/logger');
const os = require('../core/os');
const { KatalonStudioDownloader } = require('./remote-downloader');
const utils = require('../core/utils');
const { resolveRelease } = require('./kre-releases');

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
    const ksVersion = resolveRelease(body, ksVersionNumber);
    if (ksVersion.version !== ksVersionNumber) {
      defaultLogger.info(`Resolved KRE version ${ksVersionNumber} to ${ksVersion.version}.`);
    }
    ksVersionNumber = ksVersion.version;

    const userhome = os.getUserHome();
    const ksLocationParentDir = path.join(userhome, '.katalon', ksVersionNumber);
    const katalonDoneFilePath = path.join(ksLocationParentDir, '.katalon.done');

    if (fs.existsSync(katalonDoneFilePath)) {
      return { ksLocationParentDir, ksVersionNumber };
    }

    defaultLogger.info(`Download KRE ${ksVersionNumber} to ${ksLocationParentDir}.`);
    const downloader = new KatalonStudioDownloader(defaultLogger, ksVersion.url);
    return downloader.download(ksLocationParentDir).then((extractedFiles) => {
      if (!extractedFiles || extractedFiles.length <= 0) {
        throw new Error(`Unable to download KRE ${ksVersionNumber}`);
      }
      fs.writeFileSync(katalonDoneFilePath, '');
      return { ksLocationParentDir, ksVersionNumber };
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
    vmargs,
    logger = defaultLogger,
    callback = () => { },
    env = {},
  ) {
    return getKsLocation(ksVersionNumber, ksLocation).then((location) => {
      const { ksLocationParentDir, ksVersionNumber: resolvedVersion } = location;
      logger.info(`Katalon Folder: ${ksLocationParentDir}`);

      if (process.env.IS_DOCKER_AGENT) {
        const kreVersion = resolvedVersion || ksVersionNumber;
        logger.info(`Check and switch java version for Docker mode to compatible KRE version: ${kreVersion}`);
        utils.switchJavaVersion(kreVersion);
      }

      let ksExecutable =
        find(ksLocationParentDir, /katalonc$|katalonc\.exe$/) ||
        find(ksLocationParentDir, /katalon$|katalon\.exe$/);
      if (!ksExecutable) {
        throw new Error(`Unable to find KRE executable in ${ksLocationParentDir}`);
      }

      logger.info(`KRE executable file: ${ksExecutable}`);

      if (!os.getVersion().includes('Windows')) {
        fs.chmodSync(ksExecutable, '755');
      }

      if (ksExecutable.indexOf(' ') >= 0) {
        ksExecutable = `"${ksExecutable}"`;
      }

      let ksCommand = utils.updateCommand(
        ksExecutable,
        { flag: '-noSplash' },
        { flag: '-runMode', value: 'console' },
        { flag: '-projectPath', value: ksProjectPath },
      );

      ksCommand = `${ksCommand} ${ksArgs}`;

      if (vmargs) {
        ksCommand = utils.updateCommand(ksCommand, { flag: `-vmargs ${vmargs}` });
      }

      const loggingKsCommand = utils.maskLog(ksCommand);
      logger.info(`Execute KRE: ${loggingKsCommand}`);
      if (logger !== defaultLogger) {
        defaultLogger.debug(`Execute KRE command: ${ksCommand}`);
      }

      return os.runCommand(ksCommand, {
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
