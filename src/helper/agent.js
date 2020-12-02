const { v4: uuidv4 } = require('uuid');

const { JOB_STATUS } = require('../config/constants');
const { KatalonCommandExecutor, GenericCommandExecutor } = require('../service/command-executor');
const logger = require('../config/logger');
const { KatalonTestProjectDownloader, GitDownloader } = require('../service/remote-downloader');

function buildUpdateJobBody(jobId, jobStatus, processId) {
  const result = {
    id: jobId,
    status: jobStatus,
    processId,
  };
  const time = new Date();
  if (jobStatus === JOB_STATUS.RUNNING) {
    result.startTime = time;
  } else if (jobStatus === JOB_STATUS.SUCCESS || jobStatus === JOB_STATUS.FAILED) {
    result.stopTime = time;
  }

  return result;
}

function createCommandExecutor(
  tokenManager,
  projectId,
  teamId,
  ksArgs,
  x11Display,
  xvfbConfiguration,
  parameter,
) {
  if (parameter.configType === 'GENERIC_COMMAND') {
    const info = {
      commands: parameter.command,
      projectId,
      sessionId: parameter.sessionId,
    };
    return new GenericCommandExecutor(tokenManager.tokenSync, info);
  }

  const info = {
    teamId,
    projectId,
    ksVersionNumber: parameter.ksVersion,
    ksLocation: parameter.ksLocation,
    ksArgs,
    x11Display,
    xvfbConfiguration,
  };
  return new KatalonCommandExecutor(tokenManager.tokenSync, info);
}

function createDownloader(tokenManager, parameter) {
  if (parameter.type === 'GIT') {
    return new GitDownloader(logger, parameter.gitRepositoryResource);
  }

  return new KatalonTestProjectDownloader(logger, parameter.downloadUrl, tokenManager.tokenSync);
}

function generateUuid() {
  return `${new Date().getTime()}-${uuidv4()}`;
}

function setLogLevel(logLevel) {
  if (logLevel) {
    logger.level = logLevel;
  }
}

module.exports = {
  buildUpdateJobBody,
  createCommandExecutor,
  createDownloader,
  generateUuid,
  setLogLevel,
};