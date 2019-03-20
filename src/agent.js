const ip = require('ip');
const path = require('path');
const uuidv4 = require('uuid/v4');

const config = require('./config');
const katalonRequest = require('./katalon-request');
const logger = require('./logger');
const os = require('./os');

const configFile = path.resolve(os.getUserHome(), '.katalon', "agentconfig");
const requestInterval = 5000;
let defaultAgentName = 'katalon-agent';
let options = { body: {}}

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

    katalonRequest.requestToken(email, password)
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
          configs.agentName=defaultAgentName;
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
        var promise = katalonRequest.requestAgentInfo(token, options);
        promise.then((response) => {
          logger.debug("RESPONSE: \n", response);
        });
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