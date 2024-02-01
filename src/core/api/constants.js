const urljoin = require('url-join');

function api([path]) {
  return urljoin('/api/v1', path);
}

const TESTOPS_BASE_URL = 'https://testops.katalon.io/';

const PATHS = {
  TOKEN: '/oauth/token',
  UPLOAD_URL: api`/files/upload-url`,
  REPORT: {
    KATALON: api`/katalon-test-reports`,
    KATALON_RECORDER: api`/katalon-recorder/test-reports`,
    JUNIT: api`/junit/test-reports`,
  },
  AGENT: api`/agent`,
  JOB: api`/jobs`,
  INFO: '/info',
};

const REPORT_TYPE = {
  JUNIT: 'junit',
  KATALON_RECORDER: 'recorder',
};

const OAUTH2_CLIENT = {
  clientSecret: 'kit_uploader',
  clientId: 'kit_uploader',
};

const OAUTH2_GRANT_TYPES = {
  PASSWORD: 'password',
  REFRESH_TOKEN: 'refresh_token',
};

const FILTERED_ERROR_CODE = new Set([400, 401, 403, 404, 500, 502, 503, 504]);

const KS_OLD_RELEASES_URL =
  'https://raw.githubusercontent.com/katalon-studio/katalon-studio/master/releases.json';

const KS_RELEASES_URL =
  'https://download.katalon.com/katalon-studio/releases.json';

const KRE_LATEST_OPTION_VALUE = 'latest';

module.exports = {
  TESTOPS_BASE_URL,
  PATHS,
  REPORT_TYPE,
  OAUTH2_CLIENT,
  OAUTH2_GRANT_TYPES,
  FILTERED_ERROR_CODE,
  KS_OLD_RELEASES_URL,
  KS_RELEASES_URL,
  KRE_LATEST_OPTION_VALUE,
};
