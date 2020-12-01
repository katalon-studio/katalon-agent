const katalonRequest = require('../helper/katalon-request');

async function makeRequestWithTokenHelper(tokenPromise, requestMethod, ...args) {
  const token = await tokenPromise;
  return requestMethod(token, ...args);
}

class KatalonRequestController {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
  }

  getBuildInfo() {
    return katalonRequest.getBuildInfo();
  }

  getUploadInfo(projectId) {
    return makeRequestWithTokenHelper(
      this.tokenManager.token,
      katalonRequest.getUploadInfo,
      projectId,
    );
  }

  notifyJob(jobId, projectId) {
    return makeRequestWithTokenHelper(
      this.tokenManager.token,
      katalonRequest.notifyJob,
      jobId,
      projectId,
    );
  }

  pingAgent(body) {
    return makeRequestWithTokenHelper(this.tokenManager.token, katalonRequest.pingAgent, body);
  }

  pingJob(jobId) {
    return makeRequestWithTokenHelper(this.tokenManager.token, katalonRequest.pingJob, jobId);
  }

  requestJob(uuid, teamId) {
    return makeRequestWithTokenHelper(
      this.tokenManager.token,
      katalonRequest.requestJob,
      uuid,
      teamId,
    );
  }

  saveJobLog(jobInfo, batch, fileName) {
    return makeRequestWithTokenHelper(
      this.tokenManager.token,
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
    return makeRequestWithTokenHelper(this.tokenManager.token, katalonRequest.updateJob, body);
  }

  updateNodeStatus(jobId, nodeStatus) {
    return makeRequestWithTokenHelper(
      this.tokenManager.token,
      katalonRequest.updateNodeStatus,
      jobId,
      nodeStatus,
    );
  }
}

module.exports.KatalonRequestController = KatalonRequestController;
