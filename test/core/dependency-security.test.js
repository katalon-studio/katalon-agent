const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createRequire } = require('module');
const { pathToFileURL } = require('url');
const axios = require('axios');
const simpleGit = require('simple-git');
const file = require('../../src/core/file');

// Keep the real dependency/consumer boundary; only unrelated network/logging modules are mocked.
jest.mock('../../src/core/api', () => ({}));
jest.mock('../../src/config/logger', () => ({}));

const requireFromGit = createRequire(require.resolve('simple-git'));
const { parseEnv } = requireFromGit('@simple-git/argv-parser');
const requireFromGlob = createRequire(require.resolve('glob'));
const requireFromJestPlugin = createRequire(require.resolve('eslint-plugin-jest'));
const requireFromTsUtils = createRequire(requireFromJestPlugin.resolve('@typescript-eslint/utils'));
const requireFromEstree = createRequire(requireFromTsUtils.resolve('@typescript-eslint/typescript-estree'));
const minimatchCopies = [
  ['runtime', requireFromGlob('minimatch')],
  ['development', requireFromEstree('minimatch')],
];
const logger = { info: jest.fn(), error: jest.fn() };
let scratch;

beforeEach(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-dependency-security-'));
});

afterEach(() => {
  fs.rmSync(scratch, { recursive: true, force: true });
});

describe('real Git dependency compatibility and guards', () => {
  it('keeps the callable CommonJS factory and clones through the real file consumer', async () => {
    expect(typeof simpleGit).toBe('function');
    const source = path.join(scratch, 'source');
    const downloads = path.join(scratch, 'downloads');
    fs.mkdirSync(source);
    fs.mkdirSync(downloads);
    execFileSync('git', ['init', '--initial-branch=main', source]);
    fs.writeFileSync(path.join(source, 'project.prj'), 'legitimate project');
    execFileSync('git', ['-C', source, 'add', 'project.prj']);
    execFileSync('git', [
      '-C', source, '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
      'commit', '-m', 'fixture',
    ]);

    await file.clone({
      repository: pathToFileURL(source).href,
      branch: 'refs/heads/main',
      username: '',
      password: '',
    }, null, downloads, {}, logger);

    expect(fs.readFileSync(path.join(downloads, 'source', 'project.prj'), 'utf8'))
      .toBe('legitimate project');
  });

  it.each(['VISUAL', 'visual', 'ViSuAl'])('classifies %s as an unsafe editor in the actual helper', (key) => {
    expect(parseEnv({ [key]: 'benign-editor' }).vulnerabilities)
      .toEqual(expect.arrayContaining([expect.objectContaining({ category: 'allowUnsafeEditor' })]));
  });

  it.each(['trailer.fixture.cmd', 'trailer.fixture.command', 'includeIf.onbranch:main.path'])(
    'blocks the executable config key %s without invoking it', async (key) => {
      await expect(simpleGit().raw(['-c', `${key}=benign`, '--version']))
        .rejects.toThrow(/not permitted|not allowed|unsafe/i);
    },
  );

  it.each(['--recei=benign', '--exec=benign'])(
    'rejects the unsafe push argument %s before a Git operation', async (flag) => {
      await expect(simpleGit().raw(['push', flag, path.join(scratch, 'unused-remote')]))
        .rejects.toThrow(/not permitted|not allowed|unsafe/i);
    },
  );
});

describe('serializer and both resolved brace-expansion copies', () => {
  it('ignores an inherited Axios visitor while preserving ordinary query serialization', () => {
    const inheritedVisitor = jest.fn(() => { throw new Error('inherited visitor executed'); });
    const original = Object.getOwnPropertyDescriptor(Object.prototype, 'visitor');
    let uri;
    try {
      // eslint-disable-next-line no-extend-native -- Model the advisory prerequisite; restore it in finally.
      Object.defineProperty(Object.prototype, 'visitor', { value: inheritedVisitor, configurable: true });
      uri = axios.getUri({ url: 'https://example.invalid/jobs', params: { id: '123' } });
    } finally {
      if (original) {
        // eslint-disable-next-line no-extend-native -- Restore the exact pre-test descriptor.
        Object.defineProperty(Object.prototype, 'visitor', original);
      } else {
        delete Object.prototype.visitor;
      }
    }
    expect(uri).toBe('https://example.invalid/jobs?id=123');
    expect(inheritedVisitor).not.toHaveBeenCalled();
  });

  describe.each(minimatchCopies)('%s brace parser', (_scope, minimatch) => {
    it('preserves ordinary report patterns', () => {
      expect(minimatch.braceExpand('reports/{unit,integration}.xml'))
        .toEqual(['reports/unit.xml', 'reports/integration.xml']);
    });

    it('bounds comma-group recursion below the minimatch input-size cap', () => {
      const pattern = `{${Array(10000).fill('{a,b}').join(',')}}`;
      expect(pattern.length).toBeLessThan(65536);
      expect(() => minimatch.braceExpand(pattern)).not.toThrow();
    });

    it('bounds deep nesting below the minimatch input-size cap', () => {
      const pattern = `${'{a,'.repeat(6000)}b${'}'.repeat(6000)}`;
      expect(pattern.length).toBeLessThan(65536);
      expect(() => minimatch.braceExpand(pattern)).not.toThrow();
    });
  });
});
