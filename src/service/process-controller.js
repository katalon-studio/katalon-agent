const fs = require('fs-extra');
const kill = require('tree-kill');
const path = require('path');
const glob = require('glob');

const logger = require('../config/logger');

const procDir = path.join(global.appRoot, 'proc');
fs.ensureDirSync(procDir);

function parsePid(pidFile) {
  const [, pid] = path.basename(pidFile).split('-');
  return parseInt(pid, 10);
}

function isProcessAlive(pid) {
  try {
    return process.kill(pid, 0);
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function killProcess(pidNumber) {
  try {
    kill(pidNumber, 'SIGINT', (error) => {
      if (error) {
        logger.error(`Unable to kill process: ${pidNumber}.`, error);
      }
    });
    logger.debug(`Process ${pidNumber} removed.`);
  } catch (error) {
    logger.error(`Unable to kill process: ${pidNumber}.`, error);
  }
}

function killAliveProcessFromProcessController(processController) {
  const pidNumber = parsePid(processController);
  if (isProcessAlive(pidNumber)) {
    killProcess(pidNumber);
  }
}

function removeController(dir) {
  try {
    fs.removeSync(path.join(procDir, dir));
    logger.info(`Process controller ${dir} removed.`);
  } catch (error) {
    logger.error(`Cannot remove controller:  ${dir}`, error);
  }
}

function killProcessFromJobId(jobId) {
  const controllerFiles = glob.sync(path.resolve(procDir, `${jobId}-*`), { nodir: true });
  if (controllerFiles.length <= 0) {
    logger.debug(`Unable to find process with job ID: ${jobId}`);
  } else {
    killAliveProcessFromProcessController(controllerFiles[0]);
  }
}

// jobid-pid
function createController(pid, jobId) {
  fs.writeFileSync(path.join(procDir, `${jobId}-${pid}`), '');
  logger.debug(`Process controller ${jobId}-${pid} created.`);
}

function removeInactiveControllers() {
  fs.readdirSync(procDir).forEach((pidFile) => {
    const pidNumber = parsePid(pidFile);
    if (isProcessAlive(pidNumber)) {
      logger.debug(`Process ${pidFile} is alive.`);
    } else {
      removeController(pidFile);
    }
  });
}

module.exports = {
  createController,
  removeInactiveControllers,
  killProcessFromJobId,
  killProcess,
};
