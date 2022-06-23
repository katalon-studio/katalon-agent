const fs = require('fs-extra');
const ip = require('ip');
const path = require('path');

const {
  buildUpdateJobBody,
  createCommandExecutor,
  createDownloader,
  generateUuid,
  setLogLevel,
} = require('../helper/agent');
const config = require('../core/config');
const { JOB_STATUS, NODE_STATUS } = require('../config/constants');
const jobLogger = require('../config/job-logger');
const logger = require('../config/logger');
const api = require('../core/api');
const os = require('../core/os');
const processController = require('./process-controller');
const { S3FileTransport } = require('../config/transports');
const utils = require('../core/utils');

const { NODE_ENV } = process.env;

const defaultConfigFile = utils.getPath('agentconfig');
const requestInterval = NODE_ENV === 'debug' ? 5 * 1000 : 60 * 1000;
const pingInterval = NODE_ENV === 'debug' ? 30 * 1000 : 60 * 1000;
const checkProcessInterval = NODE_ENV === 'debug' ? 30 * 1000 : 60 * 5 * 1000;
const syncJobInterval = NODE_ENV === 'debug' ? 15 * 1000 : 30 * 1000;
const sendLogWaitInterval = 10 * 1000;

function updateJobStatus(jobId, jobStatus, processId = null) {
  const body = buildUpdateJobBody(jobId, jobStatus, processId);
  return api.updateJob(body);
}

async function uploadLog(jobInfo, filePath) {
  logger.info('Uploading job execution log...');
  // Request upload URL
  const response = await api.getUploadInfo(jobInfo.projectId);
  if (!response || !response.body) {
    return null;
  }

  const { body } = response;
  const { uploadUrl } = body;
  const uploadPath = body.path;

  if (jobInfo.uploadPath) {
    jobInfo.oldUploadPath = jobInfo.uploadPath;
  }

  jobInfo.uploadUrl = uploadUrl;
  jobInfo.uploadPath = uploadPath;

  await api.uploadFile(uploadUrl, filePath);

  const batch = generateUuid();
  const fileName = path.basename(filePath);

  // Update job's upload file
  return api.saveJobLog(jobInfo, batch, fileName);
}

async function getProfiles() {
  logger.info('Getting server profiles...');
  const response = await api.getBuildInfo();
  if (!response || !response.body) {
    return null;
  }

  const {
    body: { profiles = {} },
  } = response;

  return profiles.active;
}

function isOnPremiseProfile(profiles) {
  if (profiles && profiles.length) {
    return profiles.includes('on-premise');
  }
  return null;
}

function notifyJob(jobId, projectId) {
  return api
    .notifyJob(jobId, projectId)
    .catch((error) => logger.warn('Unable to send job notification:', error));
}

function pingAgent(body) {
  logger.trace(body);
  return api
    .pingAgent(body)
    .catch((err) => logger.error('Cannot send agent info to server:', err));
}

function synchronizeJob(jobId, onJobSynchronization = () => {}) {
  return setInterval(async () => {
    try {
      const synchronizedJob = await api.pingJob(jobId);
      await onJobSynchronization(synchronizedJob && synchronizedJob.body);
    } catch (err) {
      logger.warn('Unable to synchronize job:', jobId, err);
    }
  }, syncJobInterval);
}

async function executeJob(jobInfo, keepFiles) {
  const { jobId, projectId } = jobInfo;
  const notify = () => notifyJob(jobId, projectId);
  let isCanceled = false;
  let jLogger;

  // Update job status to running
  // Take the job even if the subsequent setup steps fail
  // Prevent the job to be queued forever
  await updateJobStatus(jobId, JOB_STATUS.RUNNING);
  const syncJobIntervalID = synchronizeJob(jobId, async (synchronizedJob) => {
    const { status, id, nodeStatus, processId } = synchronizedJob;
    if (status === JOB_STATUS.CANCELED && nodeStatus === NODE_STATUS.PENDING_CANCELED) {
      isCanceled = true;
      try {
        if (processId) {
          processController.killProcessFromJobId(id);
        }
        await api.updateNodeStatus(id, NODE_STATUS.CANCELED);
      } catch (err) {
        logger.error(`Error when canceling job ${id}:`, err);
      }
      logger.info(`Job ${jobId} is canceled.`);
    }
  });

  // Create directory where temporary files are contained
  const tmpRoot = path.resolve(global.appRoot, 'tmp/');
  fs.ensureDirSync(tmpRoot);

  // Create temporary directory to keep extracted project
  const tmpDir = utils.createTempDir(tmpRoot, { postfix: jobId });
  const tmpDirPath = tmpDir.name;
  logger.info('Download test project to temp directory:', tmpDirPath);

  // Create job logger
  const logFilePath = path.resolve(tmpDirPath, 'debug.log');

  try {
    // Create logger for job
    jLogger = jobLogger.getLogger(logFilePath);

    // Upload log and add new transport to stream log content to s3
    // Everytime a new log entry is written to file
    await uploadLog(jobInfo, logFilePath);
    jLogger.add(
      new S3FileTransport(
        {
          filePath: logFilePath,
          signedUrl: jobInfo.uploadUrl,
          logger,
          wait: sendLogWaitInterval,
        },
        notify,
      ),
    );

    jLogger.info(`Triggered by Katalon Agent ${config.version}.`);
    jLogger.info(`Agent server: ${config.serverUrl}${config.isOnPremise ? ' (OnPremise)' : ''}`);
    jLogger.info(`Agent user: ${config.email}`);

    if (isCanceled) {
      jLogger.debug(`Job ${jobId} is canceled. Stop test project download.`);
      return;
    }

    logger.info('Downloading test project...');
    const { downloader, executor } = jobInfo;
    downloader.logger = jLogger;
    await downloader.download(tmpDirPath);

    if (isCanceled) {
      jLogger.debug(`Job ${jobId} is canceled. Stop command execution.`);
      return;
    }

    logger.info(`Create controller for job ID: ${jobId}`);
    let processId = null;
    const status = await executor.execute(jLogger, tmpDirPath, (pid) => {
      processId = pid;
      processController.createController(pid, jobId);
      updateJobStatus(jobId, JOB_STATUS.RUNNING, processId);
    });

    if (isCanceled) {
      jLogger.debug(`Job ${jobId} is canceled.`);
      return;
    }

    logger.info('Job execution finished.');
    logger.debug('JOB FINISHED WITH STATUS:', status);

    // Update job status after execution
    const jobStatus = status === 0 ? JOB_STATUS.SUCCESS : JOB_STATUS.FAILED;

    logger.debug(`Update job with status '${jobStatus}.'`);
    await updateJobStatus(jobId, jobStatus, processId);
    logger.info('Job execution has been completed.');
  } catch (err) {
    logger.error(`${executeJob.name}:`, err);
    jLogger.error(err);

    // Update job status to failed when exception occured
    // NOTE: Job status is set FAILED might not be because of a failed execution
    // but because of other reasons such as cannot remove tmp directory or cannot upload log
    const jobStatus = JOB_STATUS.FAILED;
    logger.debug(`Error caught during job execution! Update job with status '${jobStatus}'`);
    await updateJobStatus(jobId, jobStatus);
  } finally {
    jLogger.close();

    await uploadLog(jobInfo, logFilePath);
    logger.info('Job execution log uploaded.');
    notify();
    clearInterval(syncJobIntervalID);

    processController.killProcessFromJobId(jobId);
    // Remove temporary directory when `keepFiles` is false
    if (!keepFiles) {
      tmpDir.removeCallback();
    }
  }
}

function validateField(configs, propertyName, configFile = defaultConfigFile) {
  if (!configs[propertyName]) {
    logger.error(`Please specify '${propertyName}' property in ${path.basename(configFile)}.`);
    return false;
  }
  return true;
}

class Agent {
  constructor(commandLineConfigs = {}) {
    const configFile = commandLineConfigs.configPath || defaultConfigFile;
    logger.info('Loading agent configs @', configFile);
    config.update(commandLineConfigs, configFile);
    setLogLevel(config.logLevel);

    validateField(config, 'email', configFile);
    validateField(config, 'apikey', configFile);
    validateField(config, 'serverUrl', configFile);
    validateField(config, 'teamId', configFile);

    this.configFile = configFile;
    this.teamId = config.teamId;
    this.apikey = config.apikey;
  }

  start() {
    logger.info(`Katalon Agent ${config.version} started @ ${new Date()}`);

    const requestAndExecuteJob = async () => {
      try {
        if (config.isOnPremise === undefined || config.isOnPremise === null) {
          const profiles = await getProfiles();
          config.isOnPremise = isOnPremiseProfile(profiles);
        }
        if (config.isOnPremise === undefined || config.isOnPremise === null) {
          return;
        }

        const configs = config.read(this.configFile);
        if (!configs.uuid) {
          configs.uuid = generateUuid();
          config.write(this.configFile, configs);
        }

        const { uuid, keepFiles, logLevel, x11Display, xvfbRun } = configs;

        setLogLevel(logLevel);

        // Agent is not executing job, request new job
        const requestJobResponse = await api.requestJob(uuid, this.teamId);
        if (
          !requestJobResponse ||
          !requestJobResponse.body ||
          !requestJobResponse.body.parameter ||
          !requestJobResponse.body.testProject
        ) {
          // There is no job to execute
          return;
        }
        const jobBody = requestJobResponse.body;
        const {
          id: jobId,
          parameter,
          testProject: { projectId },
        } = jobBody;

        let ksArgs;
        if (config.isOnPremise) {
          ksArgs = utils.updateCommand(parameter.command, {
            flag: '-apiKeyOnPremise',
            value: this.apikey,
          });
        } else {
          ksArgs = utils.updateCommand(
            parameter.command,
            { flag: '-apiKey', value: this.apikey },
          );
        }

        const downloader = createDownloader(parameter);
        const executor = createCommandExecutor(
          projectId,
          this.teamId,
          ksArgs,
          x11Display,
          xvfbRun,
          parameter,
        );

        const jobInfo = {
          downloader,
          executor,
          jobId,
          projectId,
          teamId: this.teamId,
        };

        await executeJob(jobInfo, keepFiles);
      } catch (err) {
        logger.error(err);
      }
    };

    const syncInfo = () => {
      const configs = config.read(this.configFile);
      if (!configs.uuid) {
        return;
      }

      if (!configs.agentName) {
        configs.agentName = os.getHostName();
      }

      pingAgent({
        uuid: configs.uuid,
        name: configs.agentName,
        teamId: this.teamId,
        hostname: os.getHostName(),
        ip: ip.address(),
        os: os.getVersion(),
        agentVersion: utils.getVersion(),
      }); // async
    };

    requestAndExecuteJob();
    setInterval(requestAndExecuteJob, requestInterval);
    setInterval(syncInfo, pingInterval);
    setInterval(processController.removeInactiveControllers, checkProcessInterval);
  }

  async startCI() {
    logger.info(`Agent (CI mode) ${config.version} started @ ${new Date()}`);

    try {
      if (config.isOnPremise === undefined || config.isOnPremise === null) {
        const profiles = await getProfiles();
        config.isOnPremise = isOnPremiseProfile(profiles);
      }
      if (config.isOnPremise === undefined || config.isOnPremise === null) {
        return;
      }

      const configs = config.read(this.configFile);

      const { keepFiles, logLevel, x11Display, xvfbRun } = configs;

      setLogLevel(logLevel);

      // Read job configuration from file
      const jobBody = fs.readJsonSync('job.json', { encoding: 'utf-8' });
      const {
        id: jobId,
        parameter,
        testProject: { projectId },
      } = jobBody;

      let ksArgs;
      if (config.isOnPremise) {
        ksArgs = utils.updateCommand(parameter.command, {
          flag: '-apiKeyOnPremise',
          value: this.apikey,
        });
      } else {
        ksArgs = utils.updateCommand(
          parameter.command,
          { flag: '-apiKey', value: this.apikey },
        );
      }

      const downloader = createDownloader(parameter);
      const executor = createCommandExecutor(
        projectId,
        this.teamId,
        ksArgs,
        x11Display,
        xvfbRun,
        parameter,
      );

      const jobInfo = {
        downloader,
        executor,
        jobId,
        projectId,
        teamId: this.teamId,
      };

      await executeJob(jobInfo, keepFiles);
    } catch (err) {
      logger.error(err);
    }
  }

  stop() {
    logger.info(`Katalon Agent ${config.version} stopped @ ${new Date()}`);
  }
}

module.exports = {
  Agent,

  updateConfigs(options) {
    const { version, configPath: configFile = defaultConfigFile, ...opts } = options;
    config.update(opts, configFile);
    if (!config.uuid) {
      config.uuid = generateUuid();
    }
    config.write(configFile, config);
    logger.info(`Updated configs @ ${configFile}.`);
  },
};
