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

configFile = path.resolve('agentconfig');
const requestInterval = 5000;
let defaultAgentName = 'katalon-agent';
let options = { body: {}}

let running = false;

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
            logger.debug("RESPONSE: \n", response);
            let res = {
              ksVersionNumber: ksVersion,
              ksLocation: ksLocation,
              ksArgs: '-retry=0 -testSuitePath="Test Suites/TS_RegressionTest" -executionProfile="default" -browserType="Chrome (headless)"',
              x11Display: null,
              xvfbConfiguration: '-a -n 0 -s "-screen 0 1024x768x24"',
              projectUrl: "https://github.com/katalon-studio-samples/ci-samples/archive/master.zip",
            };
            return res;            
          })
          .then((res) => {
            if (!running) {
              let tmpDir = tmp.dirSync({ unsafeCleanup: true, keep: true });
              let tmpDirPath = tmpDir.name;
              let jLogger = jobLogger.getLogger(path.resolve(tmpDirPath, 'debug.log'));
              res.ksProjectPath = path.resolve(tmpDir.name, 'ci-samples-master/test.prj');
              running = true;
              
              return file.downloadAndExtract(res.projectUrl, tmpDirPath)
              .then(() => ks.execute(res.ksVersionNumber, res.ksLocation,
                res.ksProjectPath, res.ksArgs,
                res.x11Display, res.xvfbConfiguration))
              .then((status) => {
                logger.info("TASK FINISHED WITH STATUS:", status);
                logger.debug("tmpDirPath:", tmpDirPath);
                if (!keepFiles) {
                  return tmpDir.removeCallback();
                }
                return;
              })
              .catch((err) => logger.error(err));
            }

            return logger.info("TASK IS RUNNING.");           
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