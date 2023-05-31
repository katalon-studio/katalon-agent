const { Agent } = require('../../src/service/agent');

const OPTIONS = {
  serverUrl: 'https://localhost.katalon.com',
  email: 'email@katalon.com',
  apikey: 'apikey',
  teamId: 12312,
  agentName: 'Agent Name',
};

describe('Agent test', () => {
  it.skip('Start agent', async () => {
    const agent = new Agent(OPTIONS);
    agent.start();
  });
});
