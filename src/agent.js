const fs = require('fs-extra');
const glob = require('glob');
const ip = require('ip');
const path = require('path');
const uuidv4 = require('uuid/v4');

const agentState = require('./agent-state');
const config = require('./config');
const file = require('./file');
const genericCommand = require('./generic-command');
const jobLogger = require('./job-logger');
const katalonRequest = require('./katalon-request');
const ks = require('./katalon-studio');
const logger = require('./logger');
const os = require('./os');
const properties = require('./properties');
const reportUploader = require('./report-uploader');
const utils = require('./utils');

const configFile = utils.getPath('agentconfig');
const requestInterval = 60 * 1000;

const projectFilePattern = '**/*.prj';
const junitFilePattern = '**/*.xml';

const testOpsPropertiesFile = 'com.kms.katalon.integration.analytics.properties';
const genericCommandOutputDir = 'katalon-agent-output';

const JOB_STATUS = Object.freeze({
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
});

function updateJob(token, jobOptions) {
  return katalonRequest.updateJob(token, jobOptions)
    .catch(err => logger.error(`${updateJob.name}:`, err));
}

function buildJobResponse(jobInfo, jobStatus) {
  const jobOptions = {
    body: {
      id: jobInfo.jobId,
      status: jobStatus,
    },
  };
  const time = new Date();
  if (jobStatus === JOB_STATUS.RUNNING) {
    jobOptions.body.startTime = time;
  } else if (jobStatus === JOB_STATUS.SUCCESS || jobStatus === JOB_STATUS.FAILED) {
    jobOptions.body.stopTime = time;
  }

  return jobOptions;
}

function buildTestOpsIntegrationProperties(token, teamId, projectId) {
  return {
    'analytics.authentication.token': token,
    'analytics.integration.enable': true,
    'analytics.server.endpoint': config.serverUrl,
    'analytics.authentication.email': config.email,
    'analytics.authentication.password': config.apikey,
    'analytics.authentication.encryptionEnabled': false,
    'analytics.team': JSON.stringify({ id: teamId.toString() }),
    'analytics.project': JSON.stringify({ id: projectId.toString() }),
    'analytics.testresult.autosubmit': true,
    'analytics.testresult.attach.screenshot': true,
    'analytics.testresult.attach.log': true,
    'analytics.testresult.attach.capturedvideos': false,
  };
}

function uploadLog(token, jobInfo, filePath) {
  logger.info('Uploading job execution log...');
  // Request upload URL
  return katalonRequest.getUploadInfo(token, jobInfo.projectId)
    .then((response) => {
      if (!response || !response.body) {
        return;
      }

      const { body } = response;
      const { uploadUrl } = body;
      const uploadPath = body.path;

      // eslint-disable-next-line no-param-reassign
      jobInfo.uploadUrl = uploadUrl;
      // eslint-disable-next-line no-param-reassign
      jobInfo.uploadPath = uploadPath;

      // Upload file with received URL
      // eslint-disable-next-line consistent-return
      return katalonRequest.uploadFile(uploadUrl, filePath);
    })
    .then(() => {
      const batch = `${new Date().getTime()}-${uuidv4()}`;
      const fileName = path.basename(filePath);

      // Update job's upload file
      return katalonRequest.saveJobLog(token, jobInfo, batch, fileName);
    });
}

function testCopyJUnitReports(outputDir) {
  const sampleDir = 'C:/Projects/katalon-analytics/misc/sample-junit-reports';
  const files = [
    'casperjs.xml',
    'sample-junit.xml',
    'sample-junit-out.xml',
  ];
  files.forEach(file => fs.copyFileSync(path.join(sampleDir, file), path.join(outputDir, file)))
}

function executeKatalonCommand(token, jobInfo, tmpDirPath, jLogger) {
  logger.info('Executing job...');
  // Find project file inside project directory
  const projectPathPattern = path.resolve(tmpDirPath, projectFilePattern);
  // eslint-disable-next-line no-param-reassign
  [jobInfo.ksProjectPath] = glob.sync(projectPathPattern, { nodir: true });

  // Manually configure integration settings for KS to upload execution report
  const ksProjectDir = path.dirname(jobInfo.ksProjectPath);
  const testOpsPropertiesPath = path.resolve(ksProjectDir, 'settings', 'internal',
    testOpsPropertiesFile);
  properties.writeProperties(testOpsPropertiesPath,
    buildTestOpsIntegrationProperties(token, jobInfo.teamId, jobInfo.projectId));

  return ks.execute(jobInfo.ksVersionNumber, jobInfo.ksLocation,
    jobInfo.ksProjectPath, jobInfo.ksArgs,
    jobInfo.x11Display, jobInfo.xvfbConfiguration, jLogger);
}

function executeJob(token, jobInfo, keepFiles) {
  // Create directory where temporary files are contained
  const tmpRoot = path.resolve(global.appRoot, 'tmp/');
  fs.ensureDir(tmpRoot);

  // Create temporary directory to keep extracted project
  const tmpDir = utils.createTempDir(tmpRoot);
  const tmpDirPath = tmpDir.name;
  logger.info('Download test project to temp directory:', tmpDirPath);

  // Create job logger
  const logFilePath = path.resolve(tmpDirPath, 'debug.log');
  const jLogger = jobLogger.getLogger(logFilePath);

  return file.downloadAndExtract(jobInfo.downloadUrl, tmpDirPath, true, jLogger)
    .then(() => {
      if (jobInfo.configType === 'GENERIC_COMMAND') {
        const { commands } = jobInfo;
        const outputDir = path.join(tmpDirPath, genericCommandOutputDir);
        fs.ensureDir(outputDir);

        const {
          projectId,
        } = jobInfo;
        let executionStatus;
        return genericCommand.executeCommands(commands, tmpDirPath, outputDir, jLogger)
          .then((status) => {
            executionStatus = status;
            // testCopyJUnitReports(outputDir);

            const opts = {
              sessionId: jobInfo.sessionId,
            };
            // Collect all junit xml files and upload to TestOps
            return reportUploader.uploadReports(token, projectId, outputDir, 'junit', junitFilePattern, opts);
          })
          .then(() => executionStatus);
      }

      return executeKatalonCommand(token, jobInfo, tmpDirPath, jLogger);
    })
    .then((status) => {
      logger.info('Job execution finished.');
      logger.debug('TASK FINISHED WITH STATUS:', status);

      // Update job status after execution
      const jobStatus = (status === 0) ? JOB_STATUS.SUCCESS : JOB_STATUS.FAILED;
      const jobOptions = buildJobResponse(jobInfo, jobStatus);

      logger.debug(`Update job with status '${jobStatus}'`);
      return updateJob(token, jobOptions);
    })
    .then(() => uploadLog(token, jobInfo, logFilePath))
    .catch((err) => {
      logger.error(`${executeJob.name}:`, err);

      // Update job status to failed when exception occured
      // NOTE: Job status is set FAILED might not be because of a failed execution
      // but because of other reasons such as cannot remove tmp directory or cannot upload log
      const jobStatus = JOB_STATUS.FAILED;
      const jobOptions = buildJobResponse(jobInfo, jobStatus);
      logger.debug(`Error caught during job execution! Update job with status '${jobStatus}'`);
      return updateJob(token, jobOptions);
    })
    .finally(() => {
      agentState.executingJob = false;
      jLogger.close();

      logger.info('Job execution has been completed.');

      // Remove temporary directory when `keepFiles` is false
      if (!keepFiles) {
        tmpDir.removeCallback();
      }
    });
}

function validateField(configs, propertyName) {
  if (!configs[propertyName]) {
    logger.error(`Please specify '${propertyName}' property in ${path.basename(configFile)}.`);
    return false;
  }
  return true;
}

function setLogLevel(logLevel) {
  if (logLevel) {
    logger.level = logLevel;
  }
}

const agent = {
  start(commandLineConfigs = {}) {
    logger.info(`Agent started @ ${new Date()}`);
    const hostAddress = ip.address();
    const hostName = os.getHostName();
    const osVersion = os.getVersion();

    config.update(commandLineConfigs, configFile);
    const {
      email, teamId,
    } = config;
    const password = config.apikey;
    setLogLevel(config.logLevel);

    validateField(config, 'email');
    validateField(config, 'apikey');
    validateField(config, 'serverUrl');
    validateField(config, 'teamId');

    if (!config.ksVersionNumber && !config.ksLocation) {
      logger.error(`Please specify 'ksVersionNumber' or 'ksLocation' property in ${path.basename(configFile)}.`);
    }

    let token;

    setInterval(() => {
      katalonRequest.requestToken(email, password)
        .then((requestTokenResponse) => {
          token = requestTokenResponse.body.access_token;
          logger.trace(`Token: ${token}`);

          const configs = config.read(configFile);
          if (!configs.uuid) {
            configs.uuid = uuidv4();
            config.write(configFile, configs);
          }

          if (!configs.agentName) {
            configs.agentName = hostName;
          }

          const {
            uuid, agentName, ksLocation, keepFiles, logLevel, x11Display, xvfbRun,
          } = configs;
          const ksVersion = configs.ksVersionNumber;

          setLogLevel(logLevel);

          const requestBody = {
            uuid,
            name: agentName,
            teamId,
            hostname: hostName,
            ip: hostAddress,
            os: osVersion,
          };
          const options = {
            body: requestBody,
          };

          logger.trace(requestBody);
          katalonRequest.pingAgent(token, options).catch(err => logger.error(err));

          if (agentState.executingJob) {
            // Agent is executing a job, do nothing
            return;
          }

          // Agent is not executing job, request new job
          // eslint-disable-next-line consistent-return
          return katalonRequest.requestJob(token, uuid, teamId)
            .then((response) => {
              if (!response || !response.body
                || !response.body.parameter || !response.body.testProject) {
                // There is no job to execute
                return;
              }
              const { body } = response;
              const { parameter, testProject, runConfiguration } = body;

              const jobInfo = {
                ksVersionNumber: ksVersion,
                ksLocation,
                ksArgs: parameter.command,
                x11Display,
                xvfbConfiguration: xvfbRun,
                downloadUrl: parameter.downloadUrl,
                jobId: body.id,
                projectId: testProject.projectId,
                teamId,
                configType: runConfiguration.configType,
                commands: runConfiguration.genericCommand,
                sessionId: parameter.sessionId,
              };
              // eslint-disable-next-line consistent-return
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
              agentState.executingJob = true;

              // eslint-disable-next-line consistent-return
              return executeJob(token, jobInfo, keepFiles);
            }).catch((err) => {
              agentState.executingJob = false;
              return logger.error(err);
            });
        })
        .catch(err => logger.error(err));
    }, requestInterval);
  },

  stop() {
    logger.info(`Agent stopped @ ${new Date()}`);
  },

  updateConfigs(options) {
    config.update(options, configFile);
    if (!config.uuid) {
      config.uuid = uuidv4();
    }
    config.write(configFile, config);
  },
};

module.exports = agent;
