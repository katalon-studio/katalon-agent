const querystring = require('querystring');
const { OAUTH2_GRANT_TYPES, OAUTH2_CLIENT } = require('./constants');
const http = require('./http');
const httpInternal = require('./http-testops');
const urlParam = require('./url-param');
const { getBasicAuthHeader } = require('./utils');

module.exports = {
  requestToken(email, password) {
    const data = querystring.stringify({
      grant_type: OAUTH2_GRANT_TYPES.PASSWORD,
      username: email,
      password,
    });
    const headers = {
      Authorization: getBasicAuthHeader({
        username: OAUTH2_CLIENT.clientId,
        password: OAUTH2_CLIENT.clientSecret,
      }),
    };
    return httpInternal.post(urlParam.accessToken(), data, headers);
  },

  refreshToken(refreshToken) {
    const data = querystring.stringify({
      grant_type: OAUTH2_GRANT_TYPES.REFRESH_TOKEN,
      refresh_token: refreshToken,
    });
    return httpInternal.post(urlParam.accessToken(), data);
  },

  getUploadInfo(projectId) {
    return httpInternal.get(urlParam.getUploadInfo(projectId));
  },

  uploadFile(uploadUrl, filePath, useS3 = true) {
    if (useS3) {
      return http.uploadFileToS3(urlParam.uploadFileToS3(uploadUrl), filePath);
    }
    return http.uploadFileToLocalStorage(urlParam.uploadFileToLocalStorage(uploadUrl), filePath);
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
    return httpInternal.post(
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
    return httpInternal.post(urlParam.pingAgent(), body);
  },

  pingJob(jobId) {
    return httpInternal.patch(urlParam.pingJob(jobId));
  },

  requestJob(uuid, teamId) {
    return httpInternal.get(urlParam.requestJob(uuid, teamId));
  },

  updateJob(body) {
    return httpInternal.post(urlParam.updateJob(), body);
  },

  saveJobLog(jobInfo, batch, fileName) {
    return httpInternal.post(urlParam.saveJobLog(jobInfo, batch, fileName));
  },

  notifyJob(jobId, projectId) {
    return httpInternal.post(urlParam.notifyJob(jobId, projectId));
  },

  getBuildInfo() {
    return httpInternal.get(urlParam.getBuildInfo());
  },

  updateNodeStatus(jobId, nodeStatus) {
    const data = {
      id: jobId,
      nodeStatus,
    };
    return httpInternal.put(urlParam.updateNodeStatus(), data);
  },

  getKSReleases() {
    return http.get(urlParam.ksReleases());
  },

  download(url, filePath) {
    return http.stream(urlParam.download(url), filePath);
  },

  downloadFromTestOps(url, filePath) {
    return httpInternal.stream(urlParam.download(url), filePath);
  },
};
