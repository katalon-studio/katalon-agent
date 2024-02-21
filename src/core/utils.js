const moment = require('moment');
const path = require('path');
const tmp = require('tmp');
const fs = require('fs');
const packageJson = require('../../package.json');
const childProcess = require('child_process');

module.exports = {
  getPath(relativePath) {
    if (!global.appRoot) {
      global.appRoot = path.resolve('.');
    }
    return path.join(global.appRoot, relativePath);
  },

  createTempDir(tmpRoot, options) {
    const tmpPrefix = moment(new Date()).format('YYYY.MM.DD-H.m-');
    const tmpDir = tmp.dirSync({
      unsafeCleanup: true,
      keep: true,
      tmpdir: tmpRoot,
      prefix: tmpPrefix,
      ...options,
    });
    return tmpDir;
  },

  stringify(object) {
    return object && Object.keys(object).length > 0 ? JSON.stringify(object, null, 2) : '';
  },

  updateCommand(command, ...options) {
    return options.reduce((cmd, option) => {
      const { flag, value } = option;
      if (cmd.includes(flag)) {
        return cmd;
      }
      if (value) {
        return `${cmd} ${flag}="${value}"`;
      }
      return `${cmd} ${flag}`;
    }, command);
  },

  overrideCommand(command, ...options) {
    return options.reduce((cmd, option) => {
      const { flag, value } = option;
      if (value) {
        if (cmd.includes(flag)) {
          const arStr = cmd.split(' ');
          const index = arStr.findIndex((t) => t.startsWith(flag));
          if (index >= 0) {
            arStr[index] = arStr[index].replace(/=.*/, `="${value}"`);
            return arStr.join(' ');
          }
        }
        return `${cmd} ${flag}="${value}"`;
      }
      return cmd;
    }, command);
  },

  getVersion() {
    return packageJson.version;
  },

  mergeEnvs(envs) {
    return envs.reduce((merged, { name, value }) => ({ ...merged, [name]: value }), {});
  },

  /**
   *
   * @param projectPath: current path
   * @param relativePath: the new path content file that want to check it exist or not
   * @returns {boolean}
   * Example:
   * projectPath: './Folder1
   * relativePath: 'TestOps/ New test.ts'
   */
  checkFileExist(dirPath, relativePath) {
    const absPath = path.join(dirPath, relativePath);
    return fs.existsSync(absPath);
  },

  /**
   *
   * @param str: string
   * @param sensitiveInfos: array contain sensitive info keys that want to hide
   * @returns string new string that is replaced sensitive info to ********
   */
  maskLog(str, sensitiveInfos = ['-apiKey', '-executionUUID']) {
    const arStr = str.split(' ');
    sensitiveInfos.forEach((item) => {
      const index = arStr.findIndex((t) => t.startsWith(item));
      if (index >= 0) {
        arStr[index] = arStr[index].replace(/=.*/, '=********');
      }
    });
    return arStr.join(' ');
  },

  runCommand(command, args, options = {}) {
    const result = childProcess.spawnSync(command, args, options);
    if (result.status !== 0) {
      throw new Error(result.stderr.toString());
    }
    return result;
  },

  switchJavaVersion(ksVersionNumber) {
    let javaPath;
    const java17Path = '/usr/lib/jvm/java-17-openjdk-amd64/bin/java';
    const java8Path = '/usr/lib/jvm/java-8-openjdk-amd64/jre/bin/java';

    if (ksVersionNumber === 'latest') {
      javaPath = java17Path;
    } else {
      javaPath = java8Path;
    }

    runCommand(
      'update-alternatives',
      [
        '--set',
        'java',
        javaPath,
      ],
      {
        stdio: 'inherit',
      },
    );
  }
};
