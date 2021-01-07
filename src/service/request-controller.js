const katalonRequest = require('../helper/katalon-request');

async function requestWrapper(requestMethod, ...args) {
  return requestMethod(...args);
}

class KatalonRequestController {
  getBuildInfo() {
    return katalonRequest.getBuildInfo();
  }

  getUploadInfo(projectId) {
    return requestWrapper(katalonRequest.getUploadInfo, projectId);
  }

  notifyJob(jobId, projectId) {
    return requestWrapper(katalonRequest.notifyJob, jobId, projectId);
  }

  pingAgent(body) {
    return requestWrapper(katalonRequest.pingAgent, body);
  }

  pingJob(jobId) {
    return requestWrapper(katalonRequest.pingJob, jobId);
  }

  requestJob(uuid, teamId) {
    return requestWrapper(katalonRequest.requestJob, uuid, teamId);
  }

  saveJobLog(jobInfo, batch, fileName) {
    return requestWrapper(katalonRequest.saveJobLog, jobInfo, batch, fileName);
  }

  uploadFile(uploadUrl, filePath) {
    return katalonRequest.uploadFile(uploadUrl, filePath);
  }

  updateJob(body) {
    return requestWrapper(katalonRequest.updateJob, body);
  }

  updateNodeStatus(jobId, nodeStatus) {
    return requestWrapper(katalonRequest.updateNodeStatus, jobId, nodeStatus);
  }
}

module.exports.KatalonRequestController = KatalonRequestController;
