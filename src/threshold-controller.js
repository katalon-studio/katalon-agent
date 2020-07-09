const fs = require('fs');
const path = require('path');
const glob = require('glob');

const logger = require('./logger');

const agentControlProcessDir = path.join(global.appRoot, 'process');
if (!fs.existsSync(agentControlProcessDir)) {
  fs.mkdirSync(agentControlProcessDir);
}

function checkRunningProcess(pid) {
  try {
    return process.kill(pid, 0);
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function killProcess(pid) {
  process.kill(pid, 'SIGHUP');
}

function removeController(dir) {
  try {
    const controllerPath = path.join(agentControlProcessDir, dir);
    if (fs.existsSync(controllerPath)) {
      fs.unlinkSync(controllerPath);
    }
    logger.info(`Process ${dir} has been removed.`);
  } catch (error) {
    logger.error(`Cannot remove controller:  ${dir}`, error);
  }
}

function killProcessFromJobId(jobId) {
  const pathPattern = path.resolve(agentControlProcessDir, `${jobId}-*`);
  const controllerFiles = glob.sync(pathPattern, { nodir: true });
  if (controllerFiles.length <= 0) {
    logger.error(`Unable to find process with job ID: ${jobId}`);
  } else {
    const [, pid] = path.basename(controllerFiles[0]).split('-');
    const pidNumber = parseInt(pid, 10);
    if (checkRunningProcess(pidNumber)) {
      try {
        killProcess(pidNumber);
        logger.info(`Process ${pidNumber} has been removed.`);
      } catch (error) {
        logger.error(`Unable to kill process: ${pidNumber}.`, error);
      }
    }
  }
}

// jobid-pid
function createController(pid, jobId) {
  const controlFilePath = path.join(agentControlProcessDir, `${jobId}-${pid}`);
  fs.writeFileSync(controlFilePath, '');
}

function checkProcess() {
  const pidFiles = fs.readdirSync(agentControlProcessDir);
  pidFiles.forEach((pidFile) => {
    const [, pid] = pidFile.split('-');
    const pidNumber = parseInt(pid, 10);
    const isAlive = checkRunningProcess(pidNumber);
    if (isAlive) {
      logger.info(`Process ${pidFile} is alive.`);
    } else {
      removeController(pidFile);
    }
  });
}

module.exports = {
  createController,
  checkProcess,
  killProcessFromJobId,
};
