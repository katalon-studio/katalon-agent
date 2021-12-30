const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const fss = require('fs');

const _ = require('lodash');
const config = require('../core/config');
const genericCommand = require('./generic-command');
const ks = require('./katalon-studio');
const properties = require('../core/properties');
const reportUploader = require('./report-uploader');
const file = require('../core/file');

const PROJECT_FILE_PATTERN = '**/*.prj';
const TESTOPS_PROPERTIES_FILE = 'com.kms.katalon.integration.analytics.properties';
const GENERIC_COMMAND_OUTPUT_DIR = 'katalon-agent-output';
const GENERIC_COMMAND_REPORT_DIR_ENV = 'KATALON_AGENT_REPORT_FOLDER';
const JUNIT_FILE_PATTERN = '**/*.xml';

function buildTestOpsIntegrationProperties(teamId, projectId) {
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
    'analytics.onpremise.enable': config.isOnPremise,
    'analytics.onpremise.server': config.serverUrl,
  };
  return {
    ...deprecatedProperties,
    'analytics.integration.enable': true,
    'analytics.team': JSON.stringify({ id: teamId.toString() }),
    'analytics.project': JSON.stringify({ id: projectId.toString() }),
    ...onPremiseProperties,
  };
}

function testCopyJUnitReports(outputDir) {
  const sampleDir = 'C:/Projects/katalon-analytics/misc/sample-junit-reports';
  const files = ['casperjs.xml', 'sample-junit.xml', 'sample-junit-out.xml'];
  files.forEach((file) => fs.copyFileSync(path.join(sampleDir, file), path.join(outputDir, file)));
}

function checkFileExist(ksProjectPath, newTestSuitePath) {
  const currentTestSuitePath = path.join(ksProjectPath, 'Test Suites');
  const allCurrentFiles = fss.readdirSync(currentTestSuitePath);
  const newFile = newTestSuitePath.split('/').pop();
  for (const file of allCurrentFiles) {
    if (file === newFile) {
      return true;
    }
  }
  return false;
}

async function downloadFile(extraFiles, ksProjectPath, jLogger) {
  const extraFileDownloads = [];
  for (const extraFile of extraFiles) {
    if (extraFile.config === 'skipIfExist') {
      // check the file actual exist
      if (!checkFileExist(ksProjectPath, extraFile.path)) {
        const target = path.join(ksProjectPath, extraFile.path);
        extraFileDownloads.push(file.downloadExtraFileFromTestOps(extraFile.contentURL, target, jLogger));
      }
    } else if (extraFile.config === 'override') {
      const target = path.join(ksProjectPath, extraFile.path);
      extraFileDownloads.push(file.downloadExtraFileFromTestOps(extraFile.contentURL, target, jLogger));
    }
  }

  await Promise.all(extraFileDownloads);
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
      this.preExecuteHook(logger, ksProjectPath);
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
    this.extraFiles = info.extraFiles;
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
      buildTestOpsIntegrationProperties(this.teamId, this.projectId),
    );
    // if the extraFiles is not provided, the agent will work as normal flow
    if (_.isArray(this.extraFiles)) {
      await downloadFile(this.extraFiles, ksProjectPath, logger);
    }
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
    // testCopyJUnitReports(outputDir);

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
