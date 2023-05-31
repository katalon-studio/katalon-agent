const { KatalonCommandExecutor, GenericCommandExecutor } = require('../../src/service/command-executor');
const properties = require('../../src/core/properties');
const reportUploader = require('../../src/service/report-uploader');
const ks = require('../../src/service/katalon-studio');
const glob = require('glob');

jest.mock('../../src/core/properties');
jest.mock('../../src/service/report-uploader');
jest.mock('../../src/service/katalon-studio');
jest.mock('../../src/core/file');
jest.mock('glob');

const logger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

const props = {
  'analytics.server.endpoint': undefined,
  'analytics.authentication.email': undefined,
  'analytics.authentication.password': undefined,
  'analytics.authentication.encryptionEnabled': false,
  'analytics.testresult.autosubmit': true,
  'analytics.testresult.attach.screenshot': true,
  'analytics.testresult.attach.log': true,
  'analytics.testresult.attach.capturedvideos': false,
  'analytics.integration.enable': true,
  'analytics.team': '{"id":"123"}',
  'analytics.project': '{"id":"123","organizationId":"undefined"}',
  'analytics.git': '{}',
  'analytics.onpremise.enable': undefined,
  'analytics.onpremise.server': undefined,
};

const ksProjectDir = '/tmp/test-project';
const ksProjectPath = `${ksProjectDir}/test-project.prj`;

// Write your test cases here
describe('KatalonCommandExecutor test', () => {
  it('Test preExecuteHook', async () => {
    // when
    const info = {
      teamId: 123,
      projectId: 123,
      extraFiles: [{
        path: 'settings/internal/com.kms.katalon.integration.analytics.properties',
        writeMode: 'SKIP_IF_EXISTS',
      }],
    };
    const executor = new KatalonCommandExecutor(info);
    await executor.preExecuteHook(logger, ksProjectPath);

    // then
    expect(properties.writeProperties).toHaveBeenCalledWith(
      expect.stringContaining('settings/internal/com.kms.katalon.integration.analytics.properties'),
      expect.objectContaining(props));
  });

  it('Test KatalonCommandExecutor execute - Cannot find KS project', async () => {
    // given
    const info = {
      teamId: 123,
      projectId: 123,
      extraFiles: [{
        path: 'settings/internal/com.kms.katalon.integration.analytics.properties',
        writeMode: 'SKIP_IF_EXISTS',
      }],
    };
    const mockCallback = jest.fn();
    glob.sync.mockReturnValueOnce([]);

    // when
    const executor = new KatalonCommandExecutor(info);
    await executor.execute(logger, ksProjectDir, mockCallback);

    // then
    expect(ks.execute).toHaveBeenCalledTimes(0);
  });

  it('Test KatalonCommandExecutor execute - Multiple KS projects', async () => {
    // given
    const info = {
      teamId: 123,
      projectId: 123,
      extraFiles: [{
        path: 'settings/internal/com.kms.katalon.integration.analytics.properties',
        writeMode: 'SKIP_IF_EXISTS',
      }],
    };
    const mockCallback = jest.fn();
    glob.sync.mockReturnValueOnce(['', '']);

    // when
    const executor = new KatalonCommandExecutor(info);
    await executor.execute(logger, ksProjectDir, mockCallback);

    // then
    expect(ks.execute).toHaveBeenCalledTimes(0);
  });

  it('Test KatalonCommandExecutor execute successfully', async () => {
    // given
    const info = {
      teamId: 123,
      projectId: 123,
      extraFiles: [{
        path: 'settings/internal/com.kms.katalon.integration.analytics.properties',
        writeMode: 'SKIP_IF_EXISTS',
      }],
    };
    const mockCallback = jest.fn();
    glob.sync.mockReturnValueOnce([ksProjectPath]);

    // when
    const executor = new KatalonCommandExecutor(info);
    await executor.execute(logger, ksProjectDir, mockCallback);

    // then
    expect(ks.execute).toHaveBeenCalledTimes(1);
  });

  it('Test GenericCommandExecutor execute successfully', async () => {
    // given
    const info = {
      teamId: 123,
      projectId: 123,
    };
    const ksProjectDir = '/tmp/test project';
    const mockCallback = jest.fn();

    // when
    const executor = new GenericCommandExecutor(info);
    await executor.execute(logger, ksProjectDir, mockCallback);

    // then
    expect(reportUploader.uploadReports).toHaveBeenCalledWith(
      123,
      expect.anything(),
      'junit',
      '**/*.xml',
      expect.anything());
  });
});
