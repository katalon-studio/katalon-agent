const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../../../src/core/config');
const controller = require('../../../src/core/api/request-controller');
const logger = require('../../../src/config/logger');

function generateUuid() {
  return `${new Date().getTime()}-${uuidv4()}`;
}

const TEST_PARAMS = {
  PROJECT_ID: 1,
  JOB_ID: 533,
  JOB_LOG: 'debug.log',
};

const debugLog = path.join(__dirname, TEST_PARAMS.JOB_LOG);

beforeAll(() => {
  config.update({}, 'agentconfig');
  logger.level = config.logLevel || 'info';
});

describe('Controller test', () => {
  let uploadInfo;
  it('should get upload info', async () => {
    const result = await controller.getUploadInfo(TEST_PARAMS.PROJECT_ID);
    expect(result.body).not.toBeNull();
    expect(result.body.uploadUrl).not.toBeNull();
    uploadInfo = result.body;
  });

  it('should upload file to S3', async () => {
    const result = await controller.uploadFile(uploadInfo.uploadUrl, debugLog);
    expect(result.status).toBe(200);
  });

  it('should save job log', async () => {
    const jobInfo = {
      projectId: TEST_PARAMS.PROJECT_ID,
      jobId: TEST_PARAMS.JOB_ID,
      uploadPath: uploadInfo.path,
    };
    const batch = generateUuid();
    const result = await controller.saveJobLog(jobInfo, batch, TEST_PARAMS.JOB_LOG);
    expect(result.status).toBe(200);
  });
});
