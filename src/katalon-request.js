const http = require('./http');
const config = require('./config');

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

  getUploadInfo(token, projectId) {
    const options = {
      auth: {
        bearer: token,
      },
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

  uploadFileInfo(token, projectId, batch, folderName, fileName, uploadedPath, isEnd, reportType) {
    let url = KATALON_TEST_REPORTS_URI;
    if (reportType === 'junit') {
      url = KATALON_JUNIT_TEST_REPORTS_URI;
    } else if (reportType === 'recorder') {
      url = KATALON_RECORDER_TEST_REPORTS_URI;
    }
    const options = {
      auth: {
        bearer: token,
      },
      json: true,
      qs: {
        projectId,
        batch,
        folderPath: folderName,
        fileName,
        uploadedPath,
        isEnd,
      },
    };
    return http.request(config.serverUrl, url, options, 'post');
  },

  pingAgent(token, options) {
    options.auth = {
      bearer: token,
    };
    return http.request(config.serverUrl, KATALON_AGENT_URI, options, 'POST');
  },

  requestJob(token, uuid, teamId) {
    const options = {
      auth: {
        bearer: token,
      },
      qs: {
        uuid,
        teamId,
      },
    };
    return http.request(config.serverUrl, `${KATALON_JOB_URI}get-job`, options, 'GET');
  },

  updateJob(token, options) {
    options.auth = {
      bearer: token,
    };
    return http.request(config.serverUrl, `${KATALON_JOB_URI}update-job`, options, 'POST');
  },

  saveJobLog(token, jobInfo, batch, fileName) {
    const options = {
      auth: {
        bearer: token,
      },
      qs: {
        projectId: jobInfo.projectId,
        jobId: jobInfo.jobId,
        batch,
        folderPath: '',
        fileName,
        uploadedPath: jobInfo.uploadPath,
      },
    };
    return http.request(config.serverUrl, `${KATALON_JOB_URI}save-log`, options, 'POST');
  },

  getJobLog(token, jobInfo) {
    const { jobId } = jobInfo;
    const options = {
      auth: {
        bearer: token,
      },
    };
    return http.request(config.serverUrl, `${KATALON_JOB_URI + jobId}/get-log`, options, 'GET');
  },
};
