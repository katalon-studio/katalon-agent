const ks = require('../src/katalon-studio');

ks.execute(
  '6.1.0',
  'C:\\data\\katalon-studio-6.1.0',
  'C:\\data\\docker-images-samples',
  '-browserType="Chrome" -retry=0 -statusDelay=15 -testSuitePath="Test Suites/TS_RegressionTest"',
  null,
  null);