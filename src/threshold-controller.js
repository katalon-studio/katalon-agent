const fs = require('fs');
const path = require('path');
const glob = require('glob');

const logger = require('./logger');
const agentState = require('./agent-state');

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
    logger.error(error);
  }
}

function killProcessFromJobId(jobId) {
  const pathPattern = path.resolve(agentControlProcessDir, `${jobId}-*`);
  const controllerFiles = glob.sync(pathPattern, { nodir: true });
  if (controllerFiles.length <= 0) {
    logger.error(`Unable to find process with job ID: ${jobId}`);
  } else {
    const ids = path.basename(controllerFiles[0]).split('-');
    const pidNumber = parseInt(ids[1], 10);
    if (checkRunningProcess(pidNumber)) {
      killProcess(pidNumber);
      logger.info(`Process ${pidNumber} has been removed.`);
    } else {
      removeController(controllerFiles[0]);
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
  let numExecutingJobs = 0;
  pidFiles.forEach((pidFile) => {
    const ids = pidFile.split('-');
    const pidNumber = parseInt(ids[1], 10);
    const isAlive = checkRunningProcess(pidNumber);
    if (isAlive) {
      logger.info(`Process ${pidFile} is alive.`);
      numExecutingJobs++;
    } else {
      removeController(pidFile);
    }
  });
  agentState.numExecutingJobs = numExecutingJobs;
}

module.exports = {
  createController,
  checkProcess,
  killProcessFromJobId,
};
