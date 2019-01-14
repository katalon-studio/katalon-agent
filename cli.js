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

var version = "Version: " + packageJson.version;
// program options and arguments
program
    .description(packageJson.description)
    .usage("[options] <JQL>")
    .version(version)
    .arguments('<JQL>')
    .option("-j, --jira-url <value>", "JIRA URL")
    .option("-u, --username <value>", "Username")
    .option("-p, --password <value>", "Password")
    .option("-o, --output <value>", "Output Directory")
    .option("-x, --proxy <value>", "HTTTP/HTTPS Proxy")
    .on('--help', function () {
    })
    .parse(process.argv);

// check to print help
if (!program.args.length && config.isConfigFileEmpty()) program.help();

var options = {
  outputDir: program.output,
  jiraUrl: program.jiraUrl,
  username: program.username,
  password: program.password,
  proxy: program.proxy,
  jql: program.args[0]
};

config.update(options);
app.main();