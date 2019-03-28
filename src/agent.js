const glob = require('glob');
const ip = require('ip');
const path = require('path');
const tmp = require('tmp');
const uuidv4 = require('uuid/v4');

const config = require('./config');
const file = require('./file');
const jobLogger = require('./job-logger');
const katalonRequest = require('./katalon-request');
const ks = require('./katalon-studio');
const logger = require('./logger');
const os = require('./os');
const utils = require('./utils')

const configFile = utils.getPath('agentconfig');
const requestInterval = 5000;
const projectFilePattern = '**/*.prj'
let options = { body: {}}

const JOB_STATUS = Object.freeze({
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
});

function updateJob(token, jobOptions) {
  return katalonRequest.updateJob(token, jobOptions)
    .then((response) => logger.debug("updateJob RESPONSE", response))
    .catch((err) => logger.error(err));
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
      updateJob(token, jobOptions);
      this.running = false;

      // Remove temporary directory when `keepFiles` is false
      if (!keepFiles) {
        return tmpDir.removeCallback();
      }
      return;
    })
    .catch((err) => {
      this.running = false;
      // Update job status to failed when exception occured
      const jobOptions = buildJobResponse(jobInfo, JOB_STATUS.FAILED);
      updateJob(token, jobOptions);

      logger.error(err);
    });
}

const agent = {
  running: false,

  start(commandLineConfigs={}) {
    logger.info('Agent started @ ' + new Date());
    const hostAddress = ip.address();
    const hostName = os.getHostName();
    const osVersion = os.getVersion();

    config.update(commandLineConfigs, configFile);
    const email = config.email;
    const password = config.password;
    const teamId = config.teamId;
    const ksVersion = config.ksVersionNumber;
    const ksLocation = config.ksLocation;
    const keepFiles = config.keepFiles;
    const logLevel = config.logLevel;
    if (logLevel) {
      logger.level = logLevel;
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

          if (this.running) {
            // Agent is executing a job, do nothing
            return;
          }

          // Agent is not executing job, request new job
          return katalonRequest.requestJob(token, configs.uuid, teamId)
            .then((response) => {
              if (!response || !response.body || !response.body.parameter) {
                // There is no job to execute
                return;
              }
              const body = response.body;
              const parameter = body.parameter;

              let jobInfo = {
                ksVersionNumber: ksVersion,
                ksLocation: ksLocation,
                ksArgs: parameter.command,
                x11Display: null,
                xvfbConfiguration: null,
                downloadUrl: parameter.downloadUrl,
                jobId: body.id,
              }
              return jobInfo;
            })
            .then((jobInfo) => {
              if (!jobInfo) {
                // There is no job to execute
                return;
              }             

              // Update job status to running
              const jobOptions = buildJobResponse(jobInfo, JOB_STATUS.RUNNING);
              updateJob(token, jobOptions);
              this.running = true;

              return executeJob(token, jobInfo, keepFiles);
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