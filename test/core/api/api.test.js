const ip = require('ip');
const os = require('os');
const path = require('path');
const tmp = require('tmp');
const { v4: uuidv4 } = require('uuid');
const api = require('../../../src/core/api');
const config = require('../../../src/core/config');
const utils = require('../../../src/core/utils');
const logger = require('../../../src/config/logger');

function generateUuid() {
  return `${new Date().getTime()}-${uuidv4()}`;
}

const TEST_PARAMS = {
  PROJECT_ID: 1,
  JOB_ID: 533,
  JOB_LOG: 'debug.log',
  DOWNLOAD_URL: 'https://github.com/katalon-studio-samples/test-project-sample/archive/master.zip',
};

const debugLog = path.join(__dirname, TEST_PARAMS.JOB_LOG);

beforeAll(() => {
  config.update({}, 'agentconfig');
  logger.level = config.logLevel || 'info';
});

describe('Controller test', () => {
  let uploadInfo;
  it('should get upload info', async () => {
    const result = await api.getUploadInfo(TEST_PARAMS.PROJECT_ID);
    expect(result.body).not.toBeNull();
    expect(result.body.uploadUrl).not.toBeNull();
    uploadInfo = result.body;
  });

  it('should upload file to S3', async () => {
    const result = await api.uploadFile(uploadInfo.uploadUrl, debugLog);
    expect(result.status).toBe(200);
  });

  it('should save job log', async () => {
    const jobInfo = {
      projectId: TEST_PARAMS.PROJECT_ID,
      jobId: TEST_PARAMS.JOB_ID,
      uploadPath: uploadInfo.path,
    };
    const batch = generateUuid();
    const result = await api.saveJobLog(jobInfo, batch, TEST_PARAMS.JOB_LOG);
    expect(result.status).toBe(200);
  });

  it('should get KS releases', async () => {
    const result = await api.getKSReleases();
    expect(result.status).toBe(200);
    expect(result.body).not.toBeNull();
    expect(result.body.length).toBeGreaterThan(1);
  });

  it('should download file', async () => {
    const tmpFile = tmp.fileSync({
      tmpdir: path.join(__dirname),
      keep: true,
    });
    const filePath = tmpFile.name;
    const result = await api.download(TEST_PARAMS.DOWNLOAD_URL, filePath);
    expect(result.status).toBe(200);
    expect(result.body).not.toBeNull();
    expect(result.body.filePath).toBe(filePath);
    expect(result.body.stat).not.toBeNull();
    expect(result.body.stat.size).toBeGreaterThan(0);
    tmpFile.removeCallback();
  });

  it('should get build info', async () => {
    const result = await api.getBuildInfo();
    expect(result.status).toBe(200);
    expect(result.body).not.toBeNull();
    expect(result.body.profiles).not.toBeNull();
    expect(result.body.profiles.active).not.toBeNull();
    expect(result.body.profiles.active.length).toBeGreaterThan(0);
  });

  it('should notify job', async () => {
    const result = await api.notifyJob(TEST_PARAMS.JOB_ID, TEST_PARAMS.PROJECT_ID);
    expect(result.status).toBe(200);
  });

  it('should request job', async () => {
    const result = await api.requestJob(config.uuid, config.teamId);
    expect(result.status).toBe(200);
  });

  it('should ping and update agent info', async () => {
    const body = {
      uuid: config.uuid,
      name: config.agentName,
      teamId: +config.teamId,
      hostname: os.hostname(),
      os: os.type(),
      ip: ip.address(),
      agentVersion: utils.getVersion(),
    };
    const result = await api.pingAgent(body);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject(body);
  });

  it('should synchronize job', async () => {
    const result = await api.pingJob(TEST_PARAMS.JOB_ID);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      id: TEST_PARAMS.JOB_ID,
    });
  });
});
