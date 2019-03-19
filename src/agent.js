const ip = require('ip');
const path = require('path');
const uuidv4 = require('uuid/v4');

const config = require('./config');
const http = require('./http');
const katalonRequest = require('./katalon-request');
const logger = require('./logger');
const os = require('./os');

const configFile = path.resolve(os.getUserHome(), '.katalon', "agentconfig");
const requestInterval = 5000;
let defaultAgentName = 'katalon-agent';
// let baseUrl = 'https://enu4mldie3ph.x.pipedream.net'
let relativeUrl = '/api/v1/agent/';
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
    const baseUrl = config.serverUrl;

    katalonRequest.requestToken(email, password)
    .then(response => {
      const token = response.body.access_token;
      logger.debug("Token: " + token);

      setInterval(() => {
        var configs = config.read(configFile);
        if (!configs.uuid) {
          var uuid = uuidv4();
          configs.uuid = uuid;
          config.write(configFile, configs);
        }
  
        if (!configs.agentName) {
          configs.agentName=defaultAgentName;
        }
  
        const body = {
          uuid: configs.uuid,
          agentName: configs.agentName,
          hostName: hostName,
          ip: hostAddress,
          os: osVersion,
        }
        options.body = body;  
  
        logger.debug(body);
        var promise = katalonRequest.requestAgentInfo(token, options);
        promise.then((response) => {
          logger.debug("RESPONSE: \n", response);
        });
        // http.request(baseUrl, relativeUrl, options, 'POST');
  
        logger.info(new Date());
      }, requestInterval);
    });    
  },

  stop() {
    logger.info('Agent stopped @ ' + new Date());
  }
}

module.exports = agent;