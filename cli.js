// add an empty argument to the front in case the package is compiled to native code
process.isPackaged && process.argv.unshift('');
process.chdir(__dirname);

var program = require('commander');
const service = require("os-service");

var packageJson = require('./package.json');
const agent = require("./src/agent").default;
var bdd = require('./src/bdd');
var config = require('./src/config');
const logger = require('./src/logger');
var reportUploader = require('./src/report-uploader');

const serviceName = "Katalon Agent";
var version = "Version: " + packageJson.version;
const _ = require("lodash");

console.log(__dirname)

// program options and arguments
program
  .description(packageJson.description)
  .command("get-feature <JQL>")
  .version(version)
  .option("-j, --jira-url <value>", "JIRA URL")
  .option("-u, --username <value>", "Username")
  .option("-p, --password <value>", "Password")
  .option("-o, --output <value>", "Output Directory")
  .option("-x, --proxy <value>", "HTTTP/HTTPS Proxy")
  .on('--help', () => {})
  .action((JQL, command) => {
    var options = {
      outputDir: command.output,
      jiraUrl: command.jiraUrl,
      username: command.username,
      password: command.password,
      proxy: command.proxy,
      jql: JQL
    };

    config.update(options);
    bdd.getFeatures();
  });

program
  .command("upload-report <path>")
  .version(version)
  .option("-s, --server-url <value>", "Katalon Analytics URL", "https://analytics.katalon.com")
  .option("-u, --username <value>", "Email")
  .option("-p, --password <value>", "Password")
  .option("-k, --katalon-project <value>", "Katalon Project Id")
  .option("-x, --proxy <value>", "HTTTP/HTTPS Proxy")
  .on('--help', () => {})
  .action((path, command) => {
    var options = {
      serverUrl: command.serverUrl,
      email: command.username,
      password: command.password,
      proxy: command.proxy,
      projectId: command.katalonProject
    };

    config.update(options);
    reportUploader.upload(path);
  });

// NOTE: MUST RUN AS ADMINISTRATOR TO ADD SERVICE
program
  .command("agent-service-add")
  .version(version)
  .action(() => {
    var options = {
      programArgs: ["agent-service-run"]
    };
    service.add(serviceName, options, (error) => {
      if (error)
        logger.log(error.toString());
    });
  });

program
  .command("agent-service-remove")
  .version(version)
  .action(() => {
    service.remove(serviceName, (error) => {
      if (error)
        logger.log(error.toString());
    });
  });

program
  .command("agent-service-run")
  .version(version)
  .action(() => {
    service.run(() => {
      agent.stop();
      service.stop(0);
    });

    agent.start();
  });

program
  .command("config")
  .option("-s, --server-url <value>", "Katalon Analytics URL")
  .option("-u, --username <value>", "Email")
  .option("-p, --password <value>", "Password")
  .option("-t, --teamid <value>", "Team ID")
  .option("-a, --agent-name <value>", "Agent name")
  .action((command) => {
    var options = {
      serverUrl: command.serverUrl,
      email: command.username,
      password: command.password,
      teamId: command.teamid,
      agentName: command.agentName,
    };
    agent.updateConfigs(options);
  });

program
  .command("start-agent")
  .version(version)
  .option("-s, --server-url <value>", "Katalon Analytics URL")
  .option("-u, --username <value>", "Email")
  .option("-p, --password <value>", "Password")
  .option("-t, --teamid <value>", "Team ID")
  .action((command) => {
    var options = {
      serverUrl: command.serverUrl,
      email: command.username,
      password: command.password,
      teamId: command.teamid,
    };
    agent.start(options);
  });

program.parse(process.argv);
