const glob = require('glob');
const { KatalonCommandExecutor, GenericCommandExecutor } = require('../../src/service/command-executor');
const properties = require('../../src/core/properties');
const reportUploader = require('../../src/service/report-uploader');
const ks = require('../../src/service/katalon-studio');
const fse = require('fs-extra');
const propertiesReader = require('properties-reader');

jest.mock('../../src/core/properties');
jest.mock('../../src/service/report-uploader');
jest.mock('../../src/service/katalon-studio');
jest.mock('../../src/core/file');
jest.mock('glob');
jest.mock('fs-extra');
jest.mock('properties-reader');

const logger = {
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
};

const mockPropertiesInstance = {
  set: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
};

propertiesReader.mockReturnValue(mockPropertiesInstance);
fse.ensureFileSync = jest.fn();

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Test preExecuteHook', async () => {
    // when
    const info = {
      teamId: 123,
      projectId: 123,
      organizationId: 456,
      extraFiles: [{
        path: 'settings/internal/com.kms.katalon.integration.analytics.properties',
        writeMode: 'SKIP_IF_EXISTS',
      }],
    };
    const executor = new KatalonCommandExecutor(info);
    await executor.preExecuteHook(logger, ksProjectPath, 'test-api-key');

    expect(fse.ensureFileSync).toHaveBeenCalled();
    expect(propertiesReader).toHaveBeenCalled();
    expect(mockPropertiesInstance.set).toHaveBeenCalledWith('analytics.integration.enable', true);
    expect(mockPropertiesInstance.set).toHaveBeenCalledWith('analytics.team', '{"id":"123"}');
    expect(mockPropertiesInstance.save).toHaveBeenCalled();
  });

  it('Test KatalonCommandExecutor execute with vmargs', async () => {
    const info = {
      teamId: 123,
      projectId: 123,
      organizationId: 456,
      vmargs: '-Xms1024m -Xmx3072m',
    };
    const mockCallback = jest.fn();
    glob.sync.mockReturnValueOnce([ksProjectPath]);

    const executor = new KatalonCommandExecutor(info);
    await executor.execute(logger, ksProjectDir, mockCallback);

    expect(ks.execute).toHaveBeenCalledTimes(1);
    const callArgs = ks.execute.mock.calls[0];
    expect(callArgs[6]).toBe(info.vmargs);
  });

  it('Test KatalonCommandExecutor execute - vmargs order is correct', async () => {
    // Mock ks.execute to capture the actual command arguments passed
    const mockKsExecute = jest.fn().mockResolvedValue(0);
    ks.execute.mockImplementation(mockKsExecute);

    // given
    const info = {
      teamId: 123,
      projectId: 123,
      organizationId: 456,
      vmargs: '-Xms2048m -Xmx4096m -XX:+UseG1GC',
      ksArgs: '-retry=0 -testSuitePath="Test Suites/TS1" -browserType="Chrome"',
    };
    const mockCallback = jest.fn();
    glob.sync.mockReturnValueOnce([ksProjectPath]);

    // when
    const executor = new KatalonCommandExecutor(info);
    await executor.execute(logger, ksProjectDir, mockCallback);

    // then
    expect(ks.execute).toHaveBeenCalledTimes(1);
    const callArgs = ks.execute.mock.calls[0];
    
    // Verify vmargs is passed as the 7th parameter (index 6)
    expect(callArgs[6]).toBe(info.vmargs);
    
    // Verify ksArgs is passed as the 4th parameter (index 3) 
    expect(callArgs[3]).toContain(info.ksArgs);
    
    // Verify that the vmargs parameter is correctly positioned for Java command line execution
    expect(callArgs[6]).toBe('-Xms2048m -Xmx4096m -XX:+UseG1GC');
  });

  it('Test KatalonCommandExecutor execute - vmargs and ksArgs together', async () => {
    // Mock ks.execute to capture all parameters
    const mockKsExecute = jest.fn().mockResolvedValue(0);
    ks.execute.mockImplementation(mockKsExecute);

    // given
    const info = {
      teamId: 123,
      projectId: 123,
      organizationId: 456,
      vmargs: '-Xms1024m -Xmx2048m',
      ksArgs: '-retry=1 -testSuitePath="Test Suites/RegressionTest"',
    };
    const mockCallback = jest.fn();
    glob.sync.mockReturnValueOnce([ksProjectPath]);

    // when
    const executor = new KatalonCommandExecutor(info);
    await executor.execute(logger, ksProjectDir, mockCallback);

    // then
    expect(ks.execute).toHaveBeenCalledTimes(1);
    const callArgs = ks.execute.mock.calls[0];
    
    // Verify all expected parameters are present and in correct positions
    expect(callArgs).toHaveLength(10); // Ensure we have the expected number of parameters
    expect(callArgs[3]).toContain(info.ksArgs); // ksArgs should be in position 3
    expect(callArgs[6]).toBe(info.vmargs); // vmargs should be in position 6
  });

  it('Test KatalonCommandExecutor execute - without vmargs', async () => {
    // Mock ks.execute to verify behavior when vmargs is not provided
    const mockKsExecute = jest.fn().mockResolvedValue(0);
    ks.execute.mockImplementation(mockKsExecute);

    // given
    const info = {
      teamId: 123,
      projectId: 123,
      organizationId: 456,
      ksArgs: '-retry=0 -testSuitePath="Test Suites/SimpleTest"',
      // vmargs intentionally omitted
    };
    const mockCallback = jest.fn();
    glob.sync.mockReturnValueOnce([ksProjectPath]);

    // when
    const executor = new KatalonCommandExecutor(info);
    await executor.execute(logger, ksProjectDir, mockCallback);

    // then
    expect(ks.execute).toHaveBeenCalledTimes(1);
    const callArgs = ks.execute.mock.calls[0];
    
    // Verify ksArgs is still passed correctly
    expect(callArgs[3]).toContain(info.ksArgs);
    
    // Verify vmargs is undefined/null when not provided
    expect(callArgs[6]).toBeUndefined();
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
      extraFiles: [
        {
          path: 'settings/internal/com.kms.katalon.integration.analytics.properties',
          writeMode: 'OVERRIDE',
        },
        {
          path: '.gitignore',
          writeMode: 'SKIP_IF_EXISTS',
        },
        {
          path: 'settings/internal/com.kms.katalon.integration.analytics.properties',
          writeMode: 'SKIP_IF_EXISTS',
        },
      ],
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
      commands: 'ls -al',
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
      expect.anything(),
      undefined);
  });
});
