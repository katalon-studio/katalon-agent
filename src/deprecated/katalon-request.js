const http = require('../core/api/http');
const config = require('../core/config');

const TOKEN_URI = '/oauth/token';
const UPLOAD_URL_URI = '/api/v1/files/upload-url';

const KATALON_TEST_REPORTS_URI = '/api/v1/katalon-test-reports';
const KATALON_RECORDER_TEST_REPORTS_URI = '/api/v1/katalon-recorder/test-reports';
const KATALON_JUNIT_TEST_REPORTS_URI = '/api/v1/junit/test-reports';

const KATALON_AGENT_URI = '/api/v1/agent/';
const KATALON_JOB_URI = '/api/v1/jobs/';

const oauth2 = {
  grant_type: 'password',
  client_secret: 'kit_uploader',
  client_id: 'kit_uploader',
};

module.exports = {
  requestToken(email, password) {
    const data = {
      username: email,
      password,
      grant_type: oauth2.grant_type,
    };
    const options = {
      auth: {
        username: oauth2.client_id,
        password: oauth2.client_secret,
      },
      form: data,
      json: true,
    };
    return http.request(config.serverUrl, TOKEN_URI, options, 'post');
  },

  refreshToken(refreshToken) {
    const data = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    };
    const options = {
      auth: {
        username: oauth2.client_id,
        password: oauth2.client_secret,
      },
      form: data,
      json: true,
    };
    return http.request(config.serverUrl, TOKEN_URI, options, 'post');
  },

  getUploadInfo(projectId) {
    const options = {
      json: true,
      qs: {
        projectId,
      },
    };
    return http.request(config.serverUrl, UPLOAD_URL_URI, options, 'get');
  },

  uploadFile(uploadUrl, filePath) {
    return http.uploadToS3(uploadUrl, filePath);
  },

  streamContent(uploadUrl, content) {
    return http.streamToS3(uploadUrl, content);
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
    let url = KATALON_TEST_REPORTS_URI;
    if (reportType === 'junit') {
      url = KATALON_JUNIT_TEST_REPORTS_URI;
    } else if (reportType === 'recorder') {
      url = KATALON_RECORDER_TEST_REPORTS_URI;
    }
    const options = {
      json: true,
      qs: {
        projectId,
        batch,
        folderPath: folderName,
        fileName,
        uploadedPath,
        isEnd,
        ...opts,
      },
    };
    return http.request(config.serverUrl, url, options, 'post');
  },

  pingAgent(body) {
    const options = {
      body,
    };
    return http.request(config.serverUrl, KATALON_AGENT_URI, options, 'POST');
  },

  pingJob(jobId) {
    const options = {
    };
    return http.request(config.serverUrl, `${KATALON_JOB_URI}${jobId}`, options, 'PATCH');
  },

  requestJob(uuid, teamId) {
    const options = {
      qs: {
        uuid,
        teamId,
      },
    };
    return http.request(config.serverUrl, `${KATALON_JOB_URI}get-job`, options, 'GET');
  },

  updateJob(body) {
    const options = {
      body,
    };
    return http.request(config.serverUrl, `${KATALON_JOB_URI}update-job`, options, 'POST');
  },

  saveJobLog(jobInfo, batch, fileName) {
    const { projectId, jobId, uploadPath, oldUploadPath } = jobInfo;
    const options = {
      qs: {
        projectId,
        jobId,
        batch,
        folderPath: '',
        fileName,
        uploadedPath: uploadPath,
        oldUploadedPath: oldUploadPath,
      },
    };
    return http.request(config.serverUrl, `${KATALON_JOB_URI}save-log`, options, 'POST');
  },

  notifyJob(jobId, projectId) {
    const options = {
      qs: {
        projectId,
      },
    };
    return http.request(config.serverUrl, `${KATALON_JOB_URI + jobId}/notify`, options, 'POST');
  },

  getBuildInfo() {
    const options = {};
    return http.request(config.serverUrl, '/info', options, 'GET');
  },

  updateNodeStatus(jobId, nodeStatus) {
    const options = {
      body: {
        id: jobId,
        nodeStatus,
      },
    };
    return http.request(config.serverUrl, `${KATALON_JOB_URI}node-status`, options, 'PUT');
  },
};
