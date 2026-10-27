const utils = require('../../src/core/utils');

const JAVA_21 = '/usr/lib/jvm/java-21-openjdk-amd64/bin/java';
const JAVA_17 = '/usr/lib/jvm/java-17-openjdk-amd64/bin/java';
const JAVA_8 = '/usr/lib/jvm/java-8-openjdk-amd64/jre/bin/java';

describe('switchJavaVersion', () => {
  let runCommand;

  beforeEach(() => {
    runCommand = jest.spyOn(utils, 'runCommand').mockImplementation(() => {});
  });

  afterEach(() => {
    runCommand.mockRestore();
  });

  it.each([
    ['11.6.0', JAVA_21],
    ['11.0.0', JAVA_21],
    ['11-latest', JAVA_21],
    ['latest', JAVA_21],
    [undefined, JAVA_21],
    ['10.4.2', JAVA_17],
    ['10-latest', JAVA_17],
    ['9.0.0', JAVA_17],
    ['8.6.9', JAVA_8],
  ])('KRE %s uses %s', (ksVersionNumber, javaPath) => {
    utils.switchJavaVersion(ksVersionNumber);
    expect(runCommand).toHaveBeenCalledWith(
      'update-alternatives',
      ['--set', 'java', javaPath],
      { stdio: 'inherit' },
    );
  });
});
