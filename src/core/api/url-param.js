const urljoin = require('url-join');
const config = require('../config');
const { KS_RELEASES_URL, PATHS, REPORT_TYPE, TESTOPS_BASE_URL } = require('./constants');

function buildUrl({ params = {}, baseUrl = config.serverUrl || TESTOPS_BASE_URL }, ...paths) {
  const url = urljoin(baseUrl, ...paths.map((p) => p.toString()));
  return {
    url,
    params,
  };
}

module.exports = {
  accessToken() {
    return buildUrl({}, PATHS.TOKEN);
  },

  getUploadInfo(projectId) {
    const params = {
      projectId,
    };
    return buildUrl({ params }, PATHS.UPLOAD_URL);
  },

  uploadFileToS3(signedUrl) {
    return buildUrl({ baseUrl: signedUrl });
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
    let path = PATHS.REPORT.KATALON;
    if (reportType === REPORT_TYPE.JUNIT) {
      path = PATHS.REPORT.JUNIT;
    } else if (reportType === REPORT_TYPE.KATALON_RECORDER) {
      path = PATHS.REPORT.KATALON_RECORDER;
    }
    const params = {
      projectId,
      batch,
      folderPath: folderName,
      fileName,
      uploadedPath,
      isEnd,
      ...extraParams,
    };
    return buildUrl({ params }, path);
  },

  pingAgent() {
    return buildUrl({}, PATHS.AGENT);
  },

  pingJob(jobId) {
    return buildUrl({}, PATHS.JOB, jobId);
  },

  requestJob(uuid, teamId) {
    const params = {
      uuid,
      teamId,
    };
    return buildUrl({ params }, PATHS.JOB, 'get-job');
  },

  updateJob() {
    return buildUrl({}, PATHS.JOB, 'update-job');
  },

  saveJobLog(jobInfo, batch, fileName) {
    const { projectId, jobId, uploadPath, oldUploadPath } = jobInfo;
    const params = {
      projectId,
      jobId,
      batch,
      folderPath: '',
      fileName,
      uploadedPath: uploadPath,
      oldUploadedPath: oldUploadPath,
    };
    return buildUrl({ params }, PATHS.JOB, 'save-log');
  },

  notifyJob(jobId, projectId) {
    const params = {
      projectId,
    };
    return buildUrl({ params }, PATHS.JOB, jobId, 'notify');
  },

  getBuildInfo() {
    return buildUrl({}, PATHS.INFO);
  },

  updateNodeStatus() {
    return buildUrl({}, PATHS.JOB, 'node-status');
  },

  ksReleases() {
    return buildUrl({ baseUrl: KS_RELEASES_URL });
  },

  download(url) {
    return buildUrl({ baseUrl: url });
  },
};
