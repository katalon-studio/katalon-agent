const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const fse = require('fs-extra');

const _ = require('lodash');
const propertiesReader = require('properties-reader');
const config = require('../core/config');
const genericCommand = require('./generic-command');
const ks = require('./katalon-studio');
// const properties = require('../core/properties');
const reportUploader = require('./report-uploader');
const file = require('../core/file');
const utils = require('../core/utils');
const os = require('../core/os');

const PROJECT_FILE_PATTERN = '**/*.prj';
const TESTOPS_PROPERTIES_FILE = 'com.kms.katalon.integration.analytics.properties';
const GENERIC_COMMAND_OUTPUT_DIR = 'katalon-agent-output';
const GENERIC_COMMAND_REPORT_DIR_ENV = 'KATALON_AGENT_REPORT_FOLDER';
const JUNIT_FILE_PATTERN = '**/*.xml';

async function configTestOpsIntegration(ksProjectDir, teamId, projectId, organizationId, apiKey) {
  const testOpsPropertiesPath = path.resolve(
    ksProjectDir,
    'settings',
    'internal',
    TESTOPS_PROPERTIES_FILE,
  );

  // Ensures that the file exists.
  // If the file in directories that do not exist, these directories are created.
  fse.ensureFileSync(testOpsPropertiesPath);

  const properties = propertiesReader(testOpsPropertiesPath, 'utf-8', { writer: { saveSections: false } });
  properties.set('analytics.server.endpoint', config.serverUrl);
  if (config.email) {
    properties.set('analytics.authentication.email', config.email);
  } else {
    properties.set('analytics.authentication.email', '');
  }
  properties.set('analytics.authentication.password', apiKey);
  properties.set('analytics.authentication.encryptionEnabled', false);
  properties.set('analytics.testresult.autosubmit', true);
  properties.set('analytics.testresult.attach.screenshot', true);
  properties.set('analytics.testresult.attach.log', true);
  properties.set('analytics.testresult.attach.capturedvideos', false);

  // Config on premise properties
  properties.set('analytics.onpremise.server', config.serverUrl);
  properties.set('analytics.onpremise.organization', JSON.stringify({ id: `${organizationId}` }));
  properties.set('analytics.onpremise.enable', false);

  properties.set('analytics.integration.enable', true);
  properties.set('analytics.team', JSON.stringify({ id: teamId.toString() }));
  properties.set('analytics.project', JSON.stringify(
    { id: projectId.toString(), organizationId: `${organizationId}` },
  ));
  properties.set('analytics.testreport.autoupload.enable', true);

  await properties.save(testOpsPropertiesPath);
}

class BaseKatalonCommandExecutor {
  constructor(info) {
    this.ksVersionNumber = info.ksVersionNumber;
    this.ksLocation = info.ksLocation;
    this.ksArgs = info.ksArgs;
    this.x11Display = info.x11Display;
    this.xvfbConfiguration = info.xvfbConfiguration;
    this.vmargs = info.vmargs;
    this.env = info.env;
  }

  async execute(logger, execDirPath, callback, apiKey) {
    // Find project file inside project directory
    const projectPathPattern = path.resolve(execDirPath, PROJECT_FILE_PATTERN);
    const ksProjectPaths = glob.sync(projectPathPattern, { nodir: true });

    logger.debug(`Execution Directory Path: ${execDirPath}.`);
    logger.debug(`Project Path Pattern: ${projectPathPattern}.`);
    logger.info(`Project Paths: ${ksProjectPaths}.`);

    const [ksProjectPath] = ksProjectPaths;

    if (this.preExecuteHook && typeof this.preExecuteHook === 'function') {
      await this.preExecuteHook(logger, ksProjectPath, apiKey);
    }

    return ks.execute(
      this.ksVersionNumber,
      this.ksLocation,
      ksProjectPath,
      this.ksArgs,
      this.x11Display,
      this.xvfbConfiguration,
      this.vmargs,
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
    this.preExecuteCommand = info.preExecuteCommand;
    this.x11Display = info.x11Display;
    this.env = info.env;
  }

  async downloadExtraFiles(extraFiles, ksProjectPath, jLogger, apiKey) {
    await Promise.all(
      extraFiles
        .filter((extraFile) =>
          (extraFile.writeMode === 'SKIP_IF_EXISTS' && !utils.checkFileExist(ksProjectPath, extraFile.path)) ||
          (extraFile.writeMode === 'OVERRIDE'))
        .map((extraFile) => file.downloadFromTestOps(
          extraFile.contentUrl,
          path.join(ksProjectPath, extraFile.path),
          apiKey,
          jLogger)),
    );
  }

  async preExecuteHook(logger, ksProjectPath, apiKey) {
    // Manually configure integration settings for KS to upload execution report
    logger.debug('Configure Katalon TestOps integration.');
    const ksProjectDir = path.dirname(ksProjectPath);

    logger.debug('Start config Katalon TestOps integration.');
    await configTestOpsIntegration(ksProjectDir, this.teamId, this.projectId, this.organizationId, apiKey);
    logger.debug('Finish config Katalon TestOps integration.');

    logger.debug('Start downloading extra files.');
    if (_.isArray(this.extraFiles)) {
      await this.downloadExtraFiles(this.extraFiles, ksProjectDir, logger, apiKey);
    }
    logger.debug('Finish downloading extra files.');

    if (this.preExecuteCommand) {
      logger.debug('Starting pre-execute command.');
      await os.runCommand(this.preExecuteCommand, {
        x11Display: this.x11Display,
        xvfbConfiguration: this.xvfbConfiguration,
        logger,
        tmpDirPath: ksProjectDir,
        env: this.env,
      });
      logger.debug('End pre-execute command.');
    }
  }
}

class GenericCommandExecutor {
  constructor(info) {
    this.commands = info.commands;
    this.projectId = info.projectId;
    this.sessionId = info.sessionId;
    this.env = info.env;
    this.xvfbConfiguration = info.xvfbConfiguration;
    this.x11Display = info.x11Display;
    this.preExecuteCommand = info.preExecuteCommand;
  }

  async execute(logger, execDirPath, callback, apiKey) {
    const outputDir = path.join(execDirPath, GENERIC_COMMAND_OUTPUT_DIR);
    fs.ensureDirSync(outputDir);
    if (this.preExecuteCommand) {
      logger.debug('Start pre-execute command.');
      await os.runCommand(this.preExecuteCommand, {
        x11Display: this.x11Display,
        xvfbConfiguration: this.xvfbConfiguration,
        logger,
        tmpDirPath: execDirPath,
        env: this.env,
      });
      logger.debug('End pre-execute command.');
    }

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
      apiKey,
    );
    logger.info('All JUnit reports successfully uploaded.');
    return status;
  }
}

module.exports.KatalonCommandExecutor = KatalonCommandExecutor;
module.exports.GenericCommandExecutor = GenericCommandExecutor;
