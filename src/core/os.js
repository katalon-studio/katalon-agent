const childProcess = require('child_process');
const os = require('os');
const tmp = require('tmp');
const utils = require('./utils');

const defaultLogger = require('../config/logger');

module.exports = {
  getUserHome() {
    return os.homedir();
  },

  getHostName() {
    return os.hostname();
  },

  getVersion() {
    let version = '';
    const type = os.type();
    const arch = os.arch();

    switch (type) {
      case 'Linux':
        version += 'Linux';
        break;
      case 'Darwin':
        version += 'macOS (app)';
        break;
      case 'Windows_NT':
        version += 'Windows';
        switch (arch) {
          case 'x32':
            version += ' 32';
            break;
          case 'x64':
            version += ' 64';
            break;
          default:
            throw new Error(`Unsupported architecture: ${arch}`);
        }
        break;
      default:
        throw new Error(`Unsupported OS: ${type}`);
    }
    return version;
  },

  runCommand(
    // executable,
    command,
    {
      x11Display,
      xvfbConfiguration,
      logger = defaultLogger,
      tmpDirPath = '',
      callback = () => {},
      env,
    },
  ) {
    let cmd;
    const args = [];
    const type = os.type();
    let shell;
    if (type === 'Windows_NT') {
      cmd = 'cmd';
      args.push('/c');
      // args.push(`"${executable}"`);
      // args.push(`"${command}"`);
      args.push(`"${command.replace(/&/g, '^&')}"`);
      shell = true;
    } else {
      if (x11Display) {
        command = `DISPLAY=${x11Display} ${command}`;
      }
      if (xvfbConfiguration) {
        command = `xvfb-run ${xvfbConfiguration} ${command}`;
      }
      cmd = 'sh';
      args.push('-c');
      // args.push(`"${executable}"`);
      args.push(`${command}`);
      shell = false;
    }

    if (!tmpDirPath) {
      const tmpDir = tmp.dirSync();
      tmpDirPath = tmpDir.name;
    }

    const loggingArgs = utils.maskLog(args.join(' '));
    logger.info(`Execute "${cmd} ${loggingArgs}" in ${tmpDirPath}.`);
    const promise = new Promise((resolve) => {
      const environment = {
        ...process.env,
        ...env,
      };
      const cmdProcess = childProcess.spawn(cmd, args, {
        cwd: tmpDirPath,
        shell,
        env: environment,
      });

      if (callback) {
        const { pid } = cmdProcess;
        callback(pid);
      }

      const stdoutStream = cmdProcess.stdout.on('data', (data) => {
        const message = utils.maskLog(data.toString());
        logger.debug(message);
      });
      const stderrStream = cmdProcess.stderr.on('data', (data) => {
        logger.debug(data.toString());
      });
      cmdProcess.on('exit', (code) => {
        logger.info(`Exit code: ${code}.`);
        stdoutStream.removeAllListeners();
        stderrStream.removeAllListeners();
        resolve(code);
      });
    });
    return promise;
  },
};
