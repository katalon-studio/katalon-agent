const childProcess = require('child_process');
const simpleGit = require('simple-git');

jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));
jest.mock('simple-git', () => jest.fn(() => ({
  clone: jest.fn(),
})));

const file = require('../../src/core/file');

const simpleGitClone = simpleGit.mock.results[0].value.clone;

const repository = 'https://github.com/katalon-studio/example.git';
const gitRepository = {
  repository,
  branch: 'refs/heads/feature/diagnostics',
  username: 'git-user',
  password: 'git-token',
};
const targetDir = 'projects/sample';
const downloadDir = '/tmp/download';
const gitDownloadDir = '/tmp/download/example.git';
const successMessages = [
  'Git clone completed successfully.',
  'Git config completed successfully.',
  'Git sparse-checkout set completed successfully.',
  'Git checkout completed successfully.',
];

function createLogger() {
  return {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };
}

describe('file.clone target-directory Git diagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    childProcess.spawnSync.mockReturnValue({ status: 0, stderr: '' });
  });

  it('runs each stage in order and logs success only after that stage completes', () => {
    const logger = createLogger();

    const result = file.clone(gitRepository, targetDir, downloadDir, {}, logger);

    expect(result).toBe(gitDownloadDir);
    expect(childProcess.spawnSync.mock.calls).toEqual([
      ['git', [
        'clone', '--no-tags', '--single-branch', '--branch', 'feature/diagnostics', '--depth', '1',
        '--no-checkout', '--sparse',
        'https://git-user:git-token@github.com/katalon-studio/example.git',
        gitDownloadDir,
      ], { encoding: 'utf8' }],
      ['git', ['config', 'core.ignorecase', 'false'], { cwd: gitDownloadDir, encoding: 'utf8' }],
      ['git', ['sparse-checkout', 'set', targetDir], { cwd: gitDownloadDir, encoding: 'utf8' }],
      ['git', ['checkout', gitRepository.branch], { cwd: gitDownloadDir, encoding: 'utf8' }],
    ]);
    expect(logger.info.mock.calls.slice(1).map(([message]) => message)).toEqual([
      ...successMessages,
      'Repository cloned successfully with sparse-checkout.',
    ]);
    successMessages.forEach((message, index) => {
      expect(logger.info.mock.invocationCallOrder[index + 1])
        .toBeGreaterThan(childProcess.spawnSync.mock.invocationCallOrder[index]);
    });
  });

  it.each([
    ['clone', 0],
    ['config', 1],
    ['sparse-checkout set', 2],
    ['checkout', 3],
  ])('fails fast when the %s stage fails', (stage, failedStageIndex) => {
    const logger = createLogger();
    for (let index = 0; index < failedStageIndex; index += 1) {
      childProcess.spawnSync.mockImplementationOnce(() => ({ status: 0, stderr: '' }));
    }
    childProcess.spawnSync.mockImplementationOnce(() => ({
      status: 128,
      stderr: 'fatal: native Git reason',
    }));

    expect(() => file.clone(gitRepository, targetDir, downloadDir, {}, logger))
      .toThrow(`Git ${stage} failed (status 128): fatal: native Git reason`);

    expect(childProcess.spawnSync).toHaveBeenCalledTimes(failedStageIndex + 1);
    expect(logger.error).toHaveBeenCalledWith(
      `Git ${stage} failed (status 128): fatal: native Git reason`,
    );
    expect(logger.info).not.toHaveBeenCalledWith(successMessages[failedStageIndex]);
    expect(logger.info).not.toHaveBeenCalledWith('Repository cloned successfully with sparse-checkout.');
  });

  it('removes URL user-info and raw or encoded credentials from logged and thrown diagnostics', () => {
    const logger = createLogger();
    const credentials = {
      ...gitRepository,
      username: 'x-access-user',
      password: 'token:@/value',
    };
    const encodedPassword = encodeURIComponent(credentials.password);
    const stderr = 'fatal: unable to access ' +
      `'https://${credentials.username}:${encodedPassword}@github.com/katalon-studio/example.git': ` +
      `credential ${credentials.password} (${encodedPassword}) was rejected`;
    childProcess.spawnSync.mockReturnValueOnce({ status: 128, stderr });

    let thrownError;
    try {
      file.clone(credentials, targetDir, downloadDir, {}, logger);
    } catch (error) {
      thrownError = error;
    }

    const diagnostic = logger.error.mock.calls[0][0];
    expect(thrownError.message).toBe(diagnostic);
    expect(diagnostic).toContain('fatal: unable to access');
    expect(diagnostic).toContain('was rejected');
    [credentials.username, credentials.password, encodedPassword].forEach((secret) => {
      expect(diagnostic).not.toContain(secret);
    });
    expect(diagnostic).not.toMatch(/https?:\/\/[^\s/@]+@/);
    expect(diagnostic).not.toContain('[object Object]');
  });

  it('reports a spawn error without stderr and stops immediately', () => {
    const logger = createLogger();
    childProcess.spawnSync.mockReturnValueOnce({
      status: null,
      stderr: '',
      error: new Error('spawn git ENOENT'),
    });

    expect(() => file.clone(gitRepository, targetDir, downloadDir, {}, logger))
      .toThrow('Git clone failed (status null): spawn git ENOENT');
    expect(childProcess.spawnSync).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith('Git clone failed (status null): spawn git ENOENT');
    expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('successfully'));
  });

  it('leaves the simple-git flow unchanged when no target directory is supplied', () => {
    const logger = createLogger();

    file.clone(gitRepository, null, downloadDir, {}, logger);

    expect(simpleGitClone).toHaveBeenCalled();
    expect(childProcess.spawnSync).not.toHaveBeenCalled();
  });
});
