const config = require('../../../src/core/config');
const { getDefaultHttpsAgent } = require('../../../src/core/api/proxy');

jest.mock('../../../src/core/config', () => ({}));
jest.mock('../../../src/config/logger', () => ({ info: jest.fn() }));

beforeEach(() => {
  delete config.tlsVerify;
  delete config.https;
});

afterEach(() => {
  getDefaultHttpsAgent().destroy();
  jest.restoreAllMocks();
});

describe('HTTPS agent TLS verification', () => {
  it.each([
    [true, true],
    [false, false],
    [undefined, false],
  ])('uses tlsVerify=%j with rejectUnauthorized=%j', (tlsVerify, rejectUnauthorized) => {
    config.tlsVerify = tlsVerify;

    expect(getDefaultHttpsAgent().options).toMatchObject({ rejectUnauthorized, keepAlive: true });
  });

  it('preserves explicit HTTPS verification options in legacy configs', () => {
    config.https = { rejectUnauthorized: true };

    expect(getDefaultHttpsAgent().options.rejectUnauthorized).toBe(true);
  });

  it('applies the TLS setting over legacy HTTPS options without discarding the CA', () => {
    config.tlsVerify = true;
    config.https = { rejectUnauthorized: false, ca: 'test-only-ca' };

    expect(getDefaultHttpsAgent().options).toMatchObject({
      rejectUnauthorized: true,
      ca: 'test-only-ca',
    });
  });

  it('reuses the agent until TLS settings change, then destroys the old agent', () => {
    config.tlsVerify = false;
    const insecureAgent = getDefaultHttpsAgent();
    const destroyAgent = jest.spyOn(insecureAgent, 'destroy');

    expect(getDefaultHttpsAgent()).toBe(insecureAgent);
    expect(destroyAgent).not.toHaveBeenCalled();
    config.tlsVerify = true;
    const secureAgent = getDefaultHttpsAgent();

    expect(secureAgent).not.toBe(insecureAgent);
    expect(secureAgent.options.rejectUnauthorized).toBe(true);
    expect(destroyAgent).toHaveBeenCalledTimes(1);
  });
});
