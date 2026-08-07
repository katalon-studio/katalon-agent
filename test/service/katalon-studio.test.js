const fs = require('fs');
const api = require('../../src/core/api');
const os = require('../../src/core/os');
const { getJavaSwitchVersion, getKsLocation } = require('../../src/service/katalon-studio');

jest.mock('../../src/core/api');
jest.mock('../../src/core/os');

describe('Katalon Studio runtime selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the pre-installed location when both location and version are provided', async () => {
    await expect(getKsLocation('10.3.0', '/opt/katalon/KRE')).resolves.toEqual({
      ksLocationParentDir: '/opt/katalon/KRE',
    });
    expect(api.getKSReleases).not.toHaveBeenCalled();
  });

  it('uses the selected version when location is absent', async () => {
    os.getVersion.mockReturnValue('linux');
    os.getUserHome.mockReturnValue('/home/agent');
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    api.getKSReleases.mockResolvedValue({
      body: [{ version: '10.3.0', os: 'linux', url: 'https://example.test/KRE.tar.gz' }],
    });

    await expect(getKsLocation('10.3.0')).resolves.toEqual({
      ksLocationParentDir: '/home/agent/.katalon/10.3.0',
    });
  });

  it('does not use the independent version for Docker Java switching when location is provided', () => {
    expect(getJavaSwitchVersion('8.6.9', '/opt/katalon/KRE')).toBeUndefined();
    expect(getJavaSwitchVersion('8.6.9')).toBe('8.6.9');
  });
});
