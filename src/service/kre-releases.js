const nodeOs = require('os');
const semver = require('semver');

const { KRE_LATEST_OPTION_VALUE } = require('../core/api/constants');

// Docker-tag-like selector on major version: `11-latest`
const WILDCARD_VERSION_REGEX = /^(\d+)-latest$/;

// Older KRE releases have no native ARM64 macOS build, so fall back to the x64 one
const PLATFORM_FALLBACKS = {
  'darwin-arm64': ['darwin-x64'],
};

function getPlatformKey(platform = nodeOs.platform(), arch = nodeOs.arch()) {
  return `${platform}-${arch}`;
}

/**
 * Converts a version selector into a semver range.
 * Returns null when the selector is an exact version.
 * Example: 'latest' => '*', '11-latest' => '11.x'
 */
function toVersionRange(ksVersionNumber) {
  if (ksVersionNumber === KRE_LATEST_OPTION_VALUE) {
    return '*';
  }
  const match = WILDCARD_VERSION_REGEX.exec(ksVersionNumber);
  if (!match) {
    return null;
  }
  return `${match[1]}.x`;
}

/**
 * Lists the releases available for the current machine as [{ version, url, sha256, format }].
 */
function getPlatformReleases(body, platformKey) {
  const platformKeys = [platformKey, ...(PLATFORM_FALLBACKS[platformKey] || [])];
  return Object.entries((body && body.releases) || {}).reduce((releases, [version, { packages = {} } = {}]) => {
    const key = platformKeys.find((k) => packages[k]);
    if (key) {
      const { url, sha256, format } = packages[key];
      releases.push({ version, url, sha256, format });
    }
    return releases;
  }, []);
}

/**
 * Resolves a version selector (exact version, 'latest', '11-latest')
 * to the matching release for the current machine.
 */
function resolveRelease(body, ksVersionNumber, platformKey = getPlatformKey()) {
  const releases = getPlatformReleases(body, platformKey);
  const range = toVersionRange(ksVersionNumber);

  let release;
  if (range === null) {
    release = releases.find(({ version }) => version === ksVersionNumber);
  } else {
    if (ksVersionNumber === KRE_LATEST_OPTION_VALUE && body.latest) {
      release = releases.find(({ version }) => version === body.latest);
    }
    if (!release) {
      const versions = releases
        .map(({ version }) => version)
        .filter((v) => semver.valid(v) && !semver.prerelease(v));
      const version = semver.maxSatisfying(versions, range);
      release = releases.find((item) => item.version === version);
    }
  }

  if (!release) {
    throw new Error(`Unable to find Katalon Runtime Engine version '${ksVersionNumber}' for ${platformKey}`);
  }
  return release;
}

module.exports = {
  getPlatformKey,
  toVersionRange,
  getPlatformReleases,
  resolveRelease,
};
