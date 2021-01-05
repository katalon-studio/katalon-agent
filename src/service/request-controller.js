const katalonRequest = require('../helper/katalon-request');

async function makeRequestWithTokenHelper(tokenPromise, requestMethod, ...args) {
  const token = await tokenPromise;
  return requestMethod(token, ...args);
}

class KatalonRequestController {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
  }

  get auth() {
    return null;
  }

  getBuildInfo() {
    return katalonRequest.getBuildInfo();
  }

  getUploadInfo(projectId) {
    return makeRequestWithTokenHelper(
      this.auth,
      katalonRequest.getUploadInfo,
      projectId,
    );
  }

  notifyJob(jobId, projectId) {
    return makeRequestWithTokenHelper(
      this.auth,
      katalonRequest.notifyJob,
      jobId,
      projectId,
    );
  }

  pingAgent(body) {
    return makeRequestWithTokenHelper(this.auth, katalonRequest.pingAgent, body);
  }

  pingJob(jobId) {
    return makeRequestWithTokenHelper(this.auth, katalonRequest.pingJob, jobId);
  }

  requestJob(uuid, teamId) {
    return makeRequestWithTokenHelper(
      this.auth,
      katalonRequest.requestJob,
      uuid,
      teamId,
    );
  }

  saveJobLog(jobInfo, batch, fileName) {
    return makeRequestWithTokenHelper(
      this.auth,
      katalonRequest.saveJobLog,
      jobInfo,
      batch,
      fileName,
    );
  }

  uploadFile(uploadUrl, filePath) {
    return katalonRequest.uploadFile(uploadUrl, filePath);
  }

  updateJob(body) {
    return makeRequestWithTokenHelper(this.auth, katalonRequest.updateJob, body);
  }

  updateNodeStatus(jobId, nodeStatus) {
    return makeRequestWithTokenHelper(
      this.auth,
      katalonRequest.updateNodeStatus,
      jobId,
      nodeStatus,
    );
  }
}

module.exports.KatalonRequestController = KatalonRequestController;
