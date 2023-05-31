const { Agent } = require('../../src/service/agent');
const api = require('../../src/core/api');

jest.mock('../../src/core/api');
jest.mock('../../src/core/utils', () => {
  const originalModule = jest.requireActual('../../src/core/utils');
  return {
    __esModule: true,
    ...originalModule,
    default: jest.fn(() => 'mocked baz'),
    mergeEnvs: jest.fn(),
  };
});

const OPTIONS = {
  serverUrl: 'https://localhost.katalon.com',
  email: 'email@katalon.com',
  apikey: 'apikey',
  teamId: 12312,
  agentName: 'Agent Name',
};

describe('Agent test', () => {
  it('Start agent', async () => {
    // given
    const buildInfoResponse = {
      body: {
        profiles: {
          active: ['default'],
        },
      },
    };
    api.getBuildInfo.mockResolvedValue(buildInfoResponse);

    const notifyJobResponse = {
      body: {},
    };
    api.notifyJob.mockResolvedValue(notifyJobResponse);

    const requestJobResponse = {
      body: {
        parameter: {
          command: 'Command',
        },
        testProject: {},
      },
    };
    api.requestJob.mockResolvedValue(requestJobResponse);

    // when
    const agent = new Agent(OPTIONS);
    agent.start();

    // then
    expect(0).toBe(0);
  });
});
