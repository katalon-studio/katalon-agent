const api = require('./api');
const http = require('./axios-http');
const { OAUTH2_GRANT_TYPES } = require('./constants');

module.exports = {
  requestToken(email, password) {
    const data = {
      grant_type: OAUTH2_GRANT_TYPES.PASSWORD,
      username: email,
      password,
    };
    return http.post(api.accessToken(), data);
  },

  refreshToken(refreshToken) {
    const data = {
      grant_type: OAUTH2_GRANT_TYPES.REFRESH_TOKEN,
      refresh_token: refreshToken,
    };
    return http.post(api.accessToken(), data);
  },

  getUploadInfo(projectId) {
    return http.get(api.getUploadInfo(projectId));
  },

  uploadFile(uploadUrl, filePath) {
    return http.uploadFileToS3(api.uploadFileToS3(uploadUrl), filePath);
  },

  uploadFileInfo(
    projectId,
    batch,
    folderName,
    fileName,
    uploadedPath,
    isEnd,
    reportType,
    opts = {},
  ) {
    return http.post(
      api.uploadFileInfo(projectId, batch, folderName, fileName, uploadedPath, isEnd, reportType),
    );
  },

  pingAgent(body) {
    return http.post(api.pingAgent(), body);
  },

  pingJob(jobId) {
    return http.patch(api.pingJob(jobId));
  },

  requestJob(uuid, teamId) {
    return http.get(api.requestJob(uuid, teamId));
  },

  updateJob(body) {
    return http.post(api.updateJob(), body);
  },

  saveJobLog(jobInfo, batch, fileName) {
    return http.post(api.saveJobLog(jobInfo, batch, fileName));
  },

  notifyJob(jobId, projectId) {
    return http.post(api.notifyJob(jobId, projectId));
  },

  getBuildInfo() {
    return http.get(api.getBuildInfo());
  },

  updateNodeStatus(jobId, nodeStatus) {
    const data = {
      id: jobId,
      nodeStatus,
    };
    return http.put(api.updateNodeStatus(), data);
  },

  getKSReleases() {
    return http.get(api.ksReleases());
  },

  download(url, filePath) {
    return http.stream(url, filePath);
  },
};
