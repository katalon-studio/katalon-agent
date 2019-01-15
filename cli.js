'use strict';

// add an empty argument to the front in case the package is compiled to native code
process.isPackaged && process.argv.unshift('');

var program = require('commander');
var packageJson = require('./package.json');
// var app = require('./src/app');
var Path = require('path');
// var config = require('./src/config');
var utils = require('./src/utils');
var logger = require('./src/logger');
var fs = require('fs');
var http = require('./src/http');
var app = require('./src/app');
var config = require('./src/config');
var reportUploader = require('./src/report-uploader');

var version = "Version: " + packageJson.version;
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
  .on('--help', function () {
  }).action((JQL, command) => {
    var options = {
      outputDir: command.output,
      jiraUrl: command.jiraUrl,
      username: command.username,
      password: command.password,
      proxy: command.proxy,
      jql: JQL
    };
    
    config.update(options);
    // check to print help
    // if (!program.args.length && config.isConfigFileEmpty()) program.help();
    app.getFeatures();
  });

program
  .command("upload-report <path>")
  .version(version)
  .option("-s, --server-url <value>", "Katalon Analytics URL", "https://analytics.katalon.com")
  .option("-u, --username <value>", "Email")
  .option("-p, --password <value>", "Password")
  .option("-x, --proxy <value>", "HTTTP/HTTPS Proxy")
  .option("--project <value>", "Project Id")
  .on('--help', function () {
  }).action((path, command) => {
    var options = {
      serverUrl: command.serverUrl,
      email: command.username,
      password: command.password,
      proxy: command.proxy,
      projectId: command.project
    };
    
    config.update(options);
    // check to print help
    // if (!program.args.length && config.isConfigFileEmpty()) program.help();
    reportUploader.upload(path);
  });

program.parse(process.argv);
