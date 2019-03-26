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

const configFile = path.resolve('agentconfig');
const requestInterval = 5000;
const projectFilePattern = '**/*.prj'
let options = { body: {}}

function updateJob(token, jobOptions) {
  return katalonRequest.updateJob(token, jobOptions)
    .then((response) => logger.debug("updateJob RESPONSE", response))
    .catch((err) => logger.error(err));
}

const agent = {
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

    katalonRequest
      .requestToken(email, password)
      .then(response => {
        const token = response.body.access_token;
        logger.debug("Token: " + token);

        setInterval(() => {
          var configs = config.read(configFile);
          if (!configs.uuid) {
            configs.uuid = uuidv4();
            config.write(configFile, configs);
          }
  
          if (!configs.agentName) {
            configs.agentName=hostName;
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
  
          logger.debug(body);
          katalonRequest.requestAgentInfo(token, options)
          .then((response) => {
            logger.debug("requestAgentInfo RESPONSE: \n", response);
            return katalonRequest.requestJob(token, configs.uuid, teamId);
          })
          .then((response) => {
            logger.debug("requestJob RESPONSE: \n", response);
            const body = response.body;
            if (!body) {
              return;
            }

            const parameter = body.parameter;
            if (!parameter) {
              return;
            }

            let jobInfo = {
              ksVersionNumber: ksVersion,
              ksLocation: ksLocation,
              ksArgs: parameter.command,
              x11Display: null,
              xvfbConfiguration: '-a -n 0 -s "-screen 0 1024x768x24"',
              downloadUrl: parameter.downloadUrl,
              jobId: body.id,
            }
            return jobInfo;            
          })
          .then((jobInfo) => {
            if (jobInfo) {
              const tmpDir = tmp.dirSync({ unsafeCleanup: true, keep: true });
              const tmpDirPath = tmpDir.name;

              const logFilePath = path.resolve(tmpDirPath, 'debug.log');
              let jLogger = jobLogger.getLogger(logFilePath);

              return file.downloadAndExtract(jobInfo.downloadUrl, tmpDirPath, jLogger)
              .then(() => {
                const projectPathPattern = path.resolve(tmpDirPath, projectFilePattern);
                jobInfo.ksProjectPath = glob.sync(projectPathPattern)[0];

                const jobOptions = {
                  body: {
                    id: jobInfo.jobId,
                    status: 'RUNNING',
                    startTime: new Date(),
                  }
                }                
                updateJob(token, jobOptions);

                return ks.execute(jobInfo.ksVersionNumber, jobInfo.ksLocation,
                                  jobInfo.ksProjectPath, jobInfo.ksArgs,
                                  jobInfo.x11Display, jobInfo.xvfbConfiguration, jLogger)
              })
              .then((status) => {
                logger.info("TASK FINISHED WITH STATUS:", status);
                logger.debug("tmpDirPath:", tmpDirPath);

                let jobStatus = "SUCCESS";
                if (status != 0) {
                  jobStatus = "FAILED";
                }

                const jobOptions = {
                  body: {
                    id: jobInfo.jobId,
                    status: jobStatus,
                    stopTime: new Date(),
                  }
                }
                updateJob(token, jobOptions);

                if (!keepFiles) {
                  return tmpDir.removeCallback();
                }
                return;
              })
              .catch((err) => logger.error(err));
            }       
          })
          .catch((err) => logger.error(err));
        }, requestInterval);
      }); 
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