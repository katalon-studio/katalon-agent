const querystring = require('querystring');
const { OAUTH2_GRANT_TYPES, OAUTH2_CLIENT } = require('./constants');
const http = require('./http');
const httpInternal = require('./http-testops');
const urlParam = require('./url-param');
const { getBasicAuthHeader } = require('./utils');
const { getAuth } = require('../auth');

function withAuthorization(apiKey) {
  return {
    Authorization: getBasicAuthHeader(getAuth(apiKey)),
  };
}

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

  getUploadInfo(projectId, apiKey) {
    return httpInternal.get(urlParam.getUploadInfo(projectId), withAuthorization(apiKey));
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
    apiKey,
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
      null,
      this.withAuthorization(apiKey),
    );
  },

  pingAgent(body) {
    return httpInternal.post(urlParam.pingAgent(), body);
  },

  pingJob(jobId, apiKey) {
    return httpInternal.patch(urlParam.pingJob(jobId), null, withAuthorization(apiKey));
  },

  requestJob(uuid, organizationId) {
    return httpInternal.get(urlParam.requestJob(uuid, organizationId));
  },

  updateJob(body, apiKey) {
    return httpInternal.post(urlParam.updateJob(), body, withAuthorization(apiKey));
  },

  saveJobLog(jobInfo, batch, fileName, apiKey) {
    return httpInternal.post(urlParam.saveJobLog(jobInfo, batch, fileName), null, withAuthorization(apiKey));
  },

  notifyJob(jobId, projectId, apiKey) {
    return httpInternal.post(urlParam.notifyJob(jobId, projectId), null, withAuthorization(apiKey));
  },

  getBuildInfo() {
    return httpInternal.get(urlParam.getBuildInfo());
  },

  updateNodeStatus(jobId, nodeStatus, apiKey) {
    const data = {
      id: jobId,
      nodeStatus,
    };
    return httpInternal.put(urlParam.updateNodeStatus(), data, withAuthorization(apiKey));
  },

  getKSReleases() {
    return http.get(urlParam.ksReleases()).catch(() => http.get(urlParam.ksReleasesOldLink()));
  },

  download(url, filePath) {
    return http.stream(urlParam.download(url), filePath);
  },

  downloadFromTestOps(url, filePath, apiKey) {
    return httpInternal.stream(urlParam.download(url), filePath, withAuthorization(apiKey));
  },
};
