const { KatalonCommandExecutor } = require('../../src/service/command-executor');
const properties = require('../../src/core/properties');

jest.mock('../../src/core/properties');

// Write your test cases here
describe('KatalonCommandExecutor test', () => {
  it('Test preExecuteHook', async () => {
    // given
    const logger = {
      debug: jest.fn(),
    };
    const ksProjectDir = '/tmp/test';
    const info = {
      teamId: 123,
      projectId: 123,
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

    // when
    const executor = new KatalonCommandExecutor(info);
    await executor.preExecuteHook(logger, ksProjectDir);

    // then
    expect(properties.writeProperties).toHaveBeenCalledWith(
      expect.stringContaining('settings/internal/com.kms.katalon.integration.analytics.properties'),
      expect.objectContaining(props));
  });
});
