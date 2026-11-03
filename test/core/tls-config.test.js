const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const config = require('../../src/core/config');

const cliPath = path.resolve(__dirname, '../../cli.js');
let tempDir;
let configPath;

function runConfigCommand(...args) {
  return spawnSync(process.execPath, [cliPath, 'config', '--config', configPath, ...args], {
    cwd: tempDir,
    encoding: 'utf8',
  });
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-tls-config-'));
  configPath = path.join(tempDir, 'agentconfig');
});

afterEach(() => {
  fs.removeSync(tempDir);
});

describe('TLS configuration', () => {
  it('generates and persists a secure default through the CLI', () => {
    const result = runConfigCommand('--agent-name', 'new-agent');

    expect(result.status).toBe(0);
    expect(config.read(configPath)).toMatchObject({ tlsVerify: true, agentName: 'new-agent' });
    expect(runConfigCommand('--agent-name', 'updated-agent').status).toBe(0);
    expect(config.read(configPath).tlsVerify).toBe(true);
  });

  it('keeps legacy configs unchanged when updating other options', () => {
    fs.writeFileSync(configPath, 'agentName=legacy-agent\n');

    expect(runConfigCommand('--agent-name', 'updated-agent').status).toBe(0);
    expect(config.read(configPath)).toEqual(expect.objectContaining({ agentName: 'updated-agent' }));
    expect(config.read(configPath)).not.toHaveProperty('tlsVerify');
  });

  it('does not reuse a previous TLS setting when loading a legacy config', () => {
    config.update({ tlsVerify: true }, configPath);
    fs.writeFileSync(configPath, 'agentName=legacy-agent\n');
    config.update({}, configPath);

    expect(config.tlsVerify).toBeUndefined();
  });

  it('accepts and preserves an explicit insecure opt-out', () => {
    expect(runConfigCommand('--tls-verify', 'false').status).toBe(0);
    expect(config.read(configPath).tlsVerify).toBe(false);
    expect(runConfigCommand('--agent-name', 'updated-agent').status).toBe(0);
    expect(config.read(configPath).tlsVerify).toBe(false);
  });

  it.each(['true', 'false', true, false])('normalizes tlsVerify=%j in the agent process', (value) => {
    config.update({ tlsVerify: value }, configPath);

    expect(config.tlsVerify).toBe(value === true || value === 'true');
  });

  it('rejects invalid CLI values without changing an existing config', () => {
    fs.writeFileSync(configPath, 'tlsVerify=true\n');
    const result = runConfigCommand('--tls-verify', 'no');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Invalid tlsVerify: expected true or false.');
    expect(() => config.update({ tlsVerify: 'no' }, configPath))
      .toThrow('Invalid tlsVerify: expected true or false.');
    expect(config.read(configPath).tlsVerify).toBe(true);
  });
});
