const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');

const _ = require('lodash');
const config = require('../core/config');
const genericCommand = require('./generic-command');
const ks = require('./katalon-studio');
const properties = require('../core/properties');
const reportUploader = require('./report-uploader');
const file = require('../core/file');
const utils = require('../core/utils');

const PROJECT_FILE_PATTERN = '**/*.prj';
const TESTOPS_PROPERTIES_FILE = 'com.kms.katalon.integration.analytics.properties';
const GENERIC_COMMAND_OUTPUT_DIR = 'katalon-agent-output';
const GENERIC_COMMAND_REPORT_DIR_ENV = 'KATALON_AGENT_REPORT_FOLDER';
const JUNIT_FILE_PATTERN = '**/*.xml';

function buildTestOpsIntegrationProperties(teamId, projectId, organizationId) {
  const deprecatedProperties = {
    'analytics.server.endpoint': config.serverUrl,
    'analytics.authentication.email': config.email,
    'analytics.authentication.password': config.apikey,
    'analytics.authentication.encryptionEnabled': false,
    'analytics.testresult.autosubmit': true,
    'analytics.testresult.attach.screenshot': true,
    'analytics.testresult.attach.log': true,
    'analytics.testresult.attach.capturedvideos': false,
  };
  const onPremiseProperties = {
    // 'onpremise.email': config.email,
    // 'onpremise.password': apiKey,
    'analytics.onpremise.server': config.serverUrl,
    'analytics.onpremise.organization': JSON.stringify({ id: `${organizationId}` }),
    // 'analytics.onpremise.enable': config.isOnPremise,
  };
  return {
    ...deprecatedProperties,
    ...onPremiseProperties,
    'analytics.integration.enable': true,
    'analytics.team': JSON.stringify({ id: teamId.toString() }),
    'analytics.project': JSON.stringify(
      { id: projectId.toString(), organizationId: `${organizationId}` },
    ),
    'analytics.testreport.autoupload.enable': true,
  };
}

class BaseKatalonCommandExecutor {
  constructor(info) {
    this.ksVersionNumber = info.ksVersionNumber;
    this.ksLocation = info.ksLocation;
    this.ksArgs = info.ksArgs;
    this.x11Display = info.x11Display;
    this.xvfbConfiguration = info.xvfbConfiguration;
    this.env = info.env;
  }

  async execute(logger, execDirPath, callback) {
    // Find project file inside project directory
    const projectPathPattern = path.resolve(execDirPath, PROJECT_FILE_PATTERN);
    const ksProjectPaths = glob.sync(projectPathPattern, { nodir: true });

    if (ksProjectPaths.length <= 0) {
      logger.error('Unable to find a Katalon project.');
      return Promise.resolve(1);
    }

    if (ksProjectPaths.length > 1) {
      logger.error(`Multiple Katalon projects are found: ${ksProjectPaths}.`);
      return Promise.resolve(1);
    }

    const [ksProjectPath] = ksProjectPaths;

    if (this.preExecuteHook && typeof this.preExecuteHook === 'function') {
      await this.preExecuteHook(logger, ksProjectPath);
    }

    return ks.execute(
      this.ksVersionNumber,
      this.ksLocation,
      ksProjectPath,
      this.ksArgs,
      this.x11Display,
      this.xvfbConfiguration,
      logger,
      callback,
      this.env,
    );
  }
}

class KatalonCommandExecutor extends BaseKatalonCommandExecutor {
  constructor(info) {
    super(info);
    this.teamId = info.teamId;
    this.projectId = info.projectId;
    this.organizationId = info.organizationId;
    this.extraFiles = info.extraFiles;
    this.gitRepository = info.gitRepository;
  }

  async downloadExtraFiles(extraFiles, ksProjectPath, jLogger) {
    await Promise.all(
      extraFiles
        .filter((extraFile) =>
          (extraFile.writeMode === 'SKIP_IF_EXISTS' && !utils.checkFileExist(ksProjectPath, extraFile.path)) ||
          (extraFile.writeMode === 'OVERRIDE'))
        .map((extraFile) => file.downloadFromTestOps(
          extraFile.contentUrl,
          path.join(ksProjectPath, extraFile.path),
          jLogger)),
    );
  }

  async preExecuteHook(logger, ksProjectPath) {
    // Manually configure integration settings for KS to upload execution report
    logger.debug('Configure Katalon TestOps integration.');
    const ksProjectDir = path.dirname(ksProjectPath);
    const testOpsPropertiesPath = path.resolve(
      ksProjectDir,
      'settings',
      'internal',
      TESTOPS_PROPERTIES_FILE,
    );
    properties.writeProperties(
      testOpsPropertiesPath,
      buildTestOpsIntegrationProperties(this.teamId, this.projectId, this.organizationId),
    );
    logger.debug('Finish configuring Katalon TestOps integration.');

    logger.debug('Start downloading extra files.');
    // The logic download extra file will run after we manually configure integration settings
    // if the extraFiles is not provided, the agent will work as normal flow
    if (_.isArray(this.extraFiles)) {
      await this.downloadExtraFiles(this.extraFiles, ksProjectDir, logger);
    }
    logger.debug('Finish downloading extra files.');
  }
}

class GenericCommandExecutor {
  constructor(info) {
    this.commands = info.commands;
    this.projectId = info.projectId;
    this.sessionId = info.sessionId;
    this.env = info.env;
  }

  async execute(logger, execDirPath, callback) {
    const outputDir = path.join(execDirPath, GENERIC_COMMAND_OUTPUT_DIR);
    fs.ensureDirSync(outputDir);

    const status = await genericCommand.executeCommands(
      this.commands,
      execDirPath,
      outputDir,
      logger,
      callback,
      this.env,
    );

    const opts = {
      sessionId: this.sessionId,
    };

    const reportLocations = [outputDir];
    const reportDir = process.env[GENERIC_COMMAND_REPORT_DIR_ENV];
    if (reportDir) {
      reportLocations.push(path.join(execDirPath, reportDir));
    }

    logger.info('Uploading JUnit reports...');
    // Collect all junit xml files and upload to TestOps
    await reportUploader.uploadReports(
      this.projectId,
      reportLocations,
      'junit',
      JUNIT_FILE_PATTERN,
      opts,
    );
    logger.info('All JUnit reports successfully uploaded.');
    return status;
  }
}

module.exports.KatalonCommandExecutor = KatalonCommandExecutor;
module.exports.GenericCommandExecutor = GenericCommandExecutor;
