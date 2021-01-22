const urljoin = require('url-join');
const { PATHS, REPORT_TYPE, KS_RELEASES_URL } = require('./constants');
const { TestOpsApiParam, ApiParam } = require('./api-param');

module.exports = {
  accessToken() {
    return new TestOpsApiParam(PATHS.TOKEN);
  },

  getUploadInfo(projectId) {
    return new TestOpsApiParam(PATHS.UPLOAD_URL, {
      params: {
        projectId,
      },
    });
  },

  uploadFileToS3(signedUrl) {
    return new ApiParam('', {
      baseUrl: signedUrl,
    });
  },

  uploadFileInfo(projectId, batch, folderName, fileName, uploadedPath, isEnd, reportType) {
    let path = PATHS.REPORT.KATALON;
    if (reportType === REPORT_TYPE.JUNIT) {
      path = PATHS.REPORT.JUNIT;
    } else if (reportType === REPORT_TYPE.KATALON_RECORDER) {
      path = PATHS.REPORT.KATALON_RECORDER;
    }
    return new TestOpsApiParam(path, {
      params: {
        projectId,
        batch,
        folderPath: folderName,
        fileName,
        uploadedPath,
        isEnd,
      },
    });
  },

  pingAgent() {
    return new TestOpsApiParam(PATHS.AGENT);
  },

  pingJob(jobId) {
    return new TestOpsApiParam(urljoin(PATHS.JOB, jobId.toString()));
  },

  requestJob(uuid, teamId) {
    return new TestOpsApiParam(urljoin(PATHS.JOB, 'get-job'), {
      params: {
        uuid,
        teamId,
      },
    });
  },

  updateJob() {
    return new TestOpsApiParam(urljoin(PATHS.JOB, 'update-job'));
  },

  saveJobLog(jobInfo, batch, fileName) {
    const { projectId, jobId, uploadPath, oldUploadPath } = jobInfo;
    return new TestOpsApiParam(urljoin(PATHS.JOB, 'save-log'), {
      params: {
        projectId,
        jobId,
        batch,
        folderPath: '',
        fileName,
        uploadedPath: uploadPath,
        oldUploadedPath: oldUploadPath,
      },
    });
  },

  notifyJob(jobId, projectId) {
    return new TestOpsApiParam(urljoin(PATHS.JOB, jobId.toString(), 'notify'), {
      params: {
        projectId,
      },
    });
  },

  getBuildInfo() {
    return new TestOpsApiParam(PATHS.INFO);
  },

  updateNodeStatus() {
    return new TestOpsApiParam(urljoin(PATHS.JOB, 'node-status'));
  },

  ksReleases() {
    return new ApiParam('', {
      baseUrl: KS_RELEASES_URL,
    });
  },
};
