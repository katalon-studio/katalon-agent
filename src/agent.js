const glob = require('glob');
const ip = require('ip');
const path = require('path');
const tmp = require('tmp');
const uuidv4 = require('uuid/v4');

const agentState = require('./agent-state');
const config = require('./config');
const file = require('./file');
const jobLogger = require('./job-logger');
const katalonRequest = require('./katalon-request');
const ks = require('./katalon-studio');
const logger = require('./logger');
const os = require('./os');
const utils = require('./utils')

const configFile = utils.getPath('agentconfig');
const requestInterval = 10000;
const projectFilePattern = '**/*.prj'
let options = { body: {}}

const JOB_STATUS = Object.freeze({
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
});

function updateJob(token, jobOptions) {
  return katalonRequest.updateJob(token, jobOptions)
    .catch((err) => logger.error(`${updateJob.name}:`, err));
}

function buildJobResponse(jobInfo, jobStatus) {
  let jobOptions = {
    body: {
      id: jobInfo.jobId,
      status: jobStatus,
    },
  }
  const time = new Date();
  if (jobStatus == JOB_STATUS.RUNNING) {
    jobOptions.body.startTime = time;
  } else if (jobStatus == JOB_STATUS.SUCCESS || jobStatus == JOB_STATUS.FAILED) {
    jobOptions.body.stopTime = time;
  }

  return jobOptions;
}

function executeJob(token, jobInfo, keepFiles) {
  // Create temporary directory to keep extracted project
  const tmpDir = tmp.dirSync({ unsafeCleanup: true, keep: true, dir: appRoot });
  const tmpDirPath = tmpDir.name;
  logger.info('tmpDirPath:', tmpDirPath)

  // Create job logger
  const logFilePath = path.resolve(tmpDirPath, 'debug.log');
  let jLogger = jobLogger.getLogger(logFilePath);

  return file.downloadAndExtract(jobInfo.downloadUrl, tmpDirPath, jLogger)
    .then(() => {
      // Find project file inside project directory
      const projectPathPattern = path.resolve(tmpDirPath, projectFilePattern);
      jobInfo.ksProjectPath = glob.sync(projectPathPattern)[0];

      return ks.execute(jobInfo.ksVersionNumber, jobInfo.ksLocation,
        jobInfo.ksProjectPath, jobInfo.ksArgs,
        jobInfo.x11Display, jobInfo.xvfbConfiguration, jLogger)
    })
    .then((status) => {
      logger.debug("TASK FINISHED WITH STATUS:", status);

      // Update job status after execution
      const jobStatus = (status == 0) ? JOB_STATUS.SUCCESS : JOB_STATUS.FAILED;
      const jobOptions = buildJobResponse(jobInfo, jobStatus);

      return updateJob(token, jobOptions);
    })
    .then(() => uploadLog(token, jobInfo, logFilePath))
    .catch((err) => {
      logger.error(`${executeJob.name}:`, err);

      // Update job status to failed when exception occured
      // NOTE: Job status is set FAILED might not be because of a failed execution
      // but because of other reasons such as cannot remove tmp directory or cannot upload log
      const jobOptions = buildJobResponse(jobInfo, JOB_STATUS.FAILED);
      return updateJob(token, jobOptions);
    })
    .finally(() => {
      agentState.executingJob = false;

      // Remove temporary directory when `keepFiles` is false
      if (!keepFiles) {
        tmpDir.removeCallback();
      }
    });
}

function uploadLog(token, jobInfo, filePath) {
  // Request upload URL
  return katalonRequest.getUploadInfo(token, jobInfo.projectId)
    .then((response) => {
      if (!response || !response.body) {
        return;
      }

      const body = response.body;
      const uploadUrl = body.uploadUrl;
      const uploadPath = body.path;

      jobInfo.uploadUrl = uploadUrl;
      jobInfo.uploadPath = uploadPath;

      // Upload file with received URL
      return katalonRequest.uploadFile(uploadUrl, filePath);
    })
    .then(() => {
      const batch = new Date().getTime() + "-" + uuidv4();
      const fileName = path.basename(filePath);

      // Update job's upload file
      return katalonRequest.saveJobLog(token, jobInfo, batch, fileName);
    });
}

function validateField(config, propertyName) {
  if (!config[propertyName]) {
    logger.error(`Please specify '${propertyName}' property in ${path.basename(configFile)}.`);
    return false;
  }
  return true;
}

const agent = {
  start(commandLineConfigs={}) {
    logger.info('Agent started @ ' + new Date());
    const hostAddress = ip.address();
    const hostName = os.getHostName();
    const osVersion = os.getVersion();

    config.update(commandLineConfigs, configFile);
    const email = config.email;
    const password = config.apikey;
    const teamId = config.teamId;
    const ksVersion = config.ksVersionNumber;
    const ksLocation = config.ksLocation;
    const keepFiles = config.keepFiles;
    const logLevel = config.logLevel;
    if (logLevel) {
      logger.level = logLevel;
    }

    validateField(config, "email");
    validateField(config, "apikey");
    validateField(config, "serverUrl");
    validateField(config, "teamId");

    if (!ksVersion && !ksLocation) {
      logger.error(`Please specify 'ksVersionNumber' or 'ksLocation' property in ${path.basename(configFile)}.`);
    }

    var token;

    setInterval(() => {
      katalonRequest.requestToken(email, password)
        .then(response => {
          token = response.body.access_token;
          logger.trace("Token: " + token);

          var configs = config.read(configFile);
          if (!configs.uuid) {
            configs.uuid = uuidv4();
            config.write(configFile, configs);
          }

          if (!configs.agentName) {
            configs.agentName = hostName;
          }

          const body = {
            uuid: configs.uuid,
            name: configs.agentName,
            teamId: teamId,
            hostname: hostName,
            ip: hostAddress,
            os: osVersion,
          }
          options.body = body;

          logger.trace(body);
          katalonRequest.pingAgent(token, options).catch((err) => logger.error(err));

          if (agentState.executingJob) {
            // Agent is executing a job, do nothing
            return;
          }

          // Agent is not executing job, request new job
          return katalonRequest.requestJob(token, configs.uuid, teamId)
            .then((response) => {
              if (!response || !response.body || !response.body.parameter || !response.body.testProject) {
                // There is no job to execute
                return;
              }
              const body = response.body;
              const parameter = body.parameter;
              const testProject = body.testProject

              let jobInfo = {
                ksVersionNumber: ksVersion,
                ksLocation: ksLocation,
                ksArgs: parameter.command,
                x11Display: null,
                xvfbConfiguration: null,
                downloadUrl: parameter.downloadUrl,
                jobId: body.id,
                projectId: testProject.projectId,
              }
              return jobInfo;
            })
            .then((jobInfo) => {
              if (!jobInfo) {`${uploadLog.name}:`
                // There is no job to execute
                return;
              }

              // Update job status to running
              const jobOptions = buildJobResponse(jobInfo, JOB_STATUS.RUNNING);
              updateJob(token, jobOptions);
              agentState.executingJob = true;

              return executeJob(token, jobInfo, keepFiles);
            }).catch(() => {
              agentState.executingJob = false;
            });
        })
        .catch(err => logger.error(err));
    }, requestInterval);
  },

  stop() {
    logger.info('Agent stopped @ ' + new Date());
  },

  updateConfigs(options) {
    config.update(options, configFile);
    if (!config.uuid) {
      config.uuid = uuidv4();
    }
    config.write(configFile, config);
  },
}

module.exports = agent;