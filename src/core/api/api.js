const urlParam = require('./url-param');
const http = require('./http');
const { OAUTH2_GRANT_TYPES } = require('./constants');

module.exports = {
  requestToken(email, password) {
    const data = {
      grant_type: OAUTH2_GRANT_TYPES.PASSWORD,
      username: email,
      password,
    };
    return http.post(urlParam.accessToken(), data);
  },

  refreshToken(refreshToken) {
    const data = {
      grant_type: OAUTH2_GRANT_TYPES.REFRESH_TOKEN,
      refresh_token: refreshToken,
    };
    return http.post(urlParam.accessToken(), data);
  },

  getUploadInfo(projectId) {
    return http.get(urlParam.getUploadInfo(projectId));
  },

  uploadFile(uploadUrl, filePath) {
    return http.uploadFileToS3(urlParam.uploadFileToS3(uploadUrl), filePath);
  },

  uploadFileInfo(
    projectId,
    batch,
    folderName,
    fileName,
    uploadedPath,
    isEnd,
    reportType,
    extraParams = {},
  ) {
    return http.post(
      urlParam.uploadFileInfo(
        projectId,
        batch,
        folderName,
        fileName,
        uploadedPath,
        isEnd,
        reportType,
        extraParams,
      ),
    );
  },

  pingAgent(body) {
    return http.post(urlParam.pingAgent(), body);
  },

  pingJob(jobId) {
    return http.patch(urlParam.pingJob(jobId));
  },

  requestJob(uuid, teamId) {
    return http.get(urlParam.requestJob(uuid, teamId));
  },

  updateJob(body) {
    return http.post(urlParam.updateJob(), body);
  },

  saveJobLog(jobInfo, batch, fileName) {
    return http.post(urlParam.saveJobLog(jobInfo, batch, fileName));
  },

  notifyJob(jobId, projectId) {
    return http.post(urlParam.notifyJob(jobId, projectId));
  },

  getBuildInfo() {
    return http.get(urlParam.getBuildInfo());
  },

  updateNodeStatus(jobId, nodeStatus) {
    const data = {
      id: jobId,
      nodeStatus,
    };
    return http.put(urlParam.updateNodeStatus(), data);
  },

  getKSReleases() {
    return http.get(urlParam.ksReleases());
  },

  download(url, filePath) {
    return http.stream(urlParam.download(url), filePath);
  },
};
