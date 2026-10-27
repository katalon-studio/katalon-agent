const {
  getPlatformKey,
  toVersionRange,
  getPlatformReleases,
  resolveRelease,
} = require('../../src/service/kre-releases');

const pkg = (version, name, format = 'tar.gz') => ({
  format,
  url: `https://download.katalon.com/${version}/Katalon_Studio_Engine_${name}-${version}.${format}`,
  sha256: `sha-${name}-${version}`,
});

const allPackages = (version) => ({
  packages: {
    'darwin-x64': pkg(version, 'MacOS'),
    'darwin-arm64': pkg(version, 'MacOS_ARM64'),
    'linux-x64': pkg(version, 'Linux_64'),
    'win32-x64': pkg(version, 'Windows_64', 'zip'),
  },
});

const newSchema = {
  schemaVersion: 1,
  latest: '11.6.0',
  releases: {
    '10.4.2': { packages: { 'darwin-x64': pkg('10.4.2', 'MacOS'), 'linux-x64': pkg('10.4.2', 'Linux_64') } },
    '10.4.3': allPackages('10.4.3'),
    '11.5.0': allPackages('11.5.0'),
    '11.5.1': allPackages('11.5.1'),
    '11.6.0': allPackages('11.6.0'),
    '11.7.0-beta': allPackages('11.7.0-beta'),
  },
};

describe('kre-releases', () => {
  describe('getPlatformKey', () => {
    it('combines platform and arch', () => {
      expect(getPlatformKey('darwin', 'arm64')).toBe('darwin-arm64');
    });
  });

  describe('toVersionRange', () => {
    it.each([
      ['latest', '*'],
      ['11-latest', '11.x'],
      ['11.5-latest', null],
      ['11.6.0', null],
      ['11-beta', null],
    ])('%s => %s', (input, expected) => {
      expect(toVersionRange(input)).toBe(expected);
    });
  });

  describe('resolveRelease', () => {
    const linux = 'linux-x64';

    it('resolves an exact version', () => {
      expect(resolveRelease(newSchema, '11.5.0', linux)).toEqual({
        version: '11.5.0',
        ...pkg('11.5.0', 'Linux_64'),
      });
    });

    it('resolves latest using the latest field', () => {
      expect(resolveRelease(newSchema, 'latest', linux).version).toBe('11.6.0');
    });

    it('resolves latest by highest stable version when latest field has no package', () => {
      const body = { ...newSchema, latest: '9.9.9' };
      expect(resolveRelease(body, 'latest', linux).version).toBe('11.6.0');
    });

    it('resolves major wildcard', () => {
      expect(resolveRelease(newSchema, '11-latest', linux).version).toBe('11.6.0');
      expect(resolveRelease(newSchema, '10-latest', linux).version).toBe('10.4.3');
    });

    it('does not support major.minor wildcard', () => {
      expect(() => resolveRelease(newSchema, '11.5-latest', linux)).toThrow(/11\.5-latest/);
    });

    it('picks the package for the current platform', () => {
      const release = resolveRelease(newSchema, '11.6.0', 'win32-x64');
      expect(release.format).toBe('zip');
      expect(release.url).toContain('Windows_64');
    });

    it('falls back to darwin-x64 on darwin-arm64', () => {
      const arm = 'darwin-arm64';
      expect(resolveRelease(newSchema, '11.6.0', arm).url).toContain('MacOS_ARM64');
      expect(resolveRelease(newSchema, '10.4.2', arm).url).toContain('MacOS-10.4.2');
    });

    it('skips releases without a package for the platform', () => {
      const win = 'win32-x64';
      expect(getPlatformReleases(newSchema, win).map(({ version }) => version)).not.toContain('10.4.2');
      expect(resolveRelease(newSchema, '10-latest', win).version).toBe('10.4.3');
    });

    it('throws when nothing matches', () => {
      expect(() => resolveRelease(newSchema, '12-latest', linux)).toThrow(/12-latest.*linux-x64/);
      expect(() => resolveRelease(newSchema, '9.0.0', linux)).toThrow(/9\.0\.0/);
    });
  });
});
