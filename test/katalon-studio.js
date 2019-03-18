const ks = require('../src/katalon-studio');

// ks.execute(
//   '5.10.1',
//   null,
//   'C:\\data\\docker-images-samples',
//   '-browserType="Chrome" -retry=0 -statusDelay=15 -testSuitePath="Test Suites/TS_RegressionTest"',
//   null,
//   null);

ks.execute(
  '5.10.1',
  null,
  '/home/hai/ci-samples',
  '-browserType="Chrome" -retry=0 -statusDelay=15 -testSuitePath="Test Suites/TS_RegressionTest"',
  null,
  '-a -n 0 -s "-screen 0 1024x768x24"');