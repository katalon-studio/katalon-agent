const path = require('path');
const uuidv4 = require('uuid/v4');

const katalonRequest = require('./katalon-request');
const logger = require('./logger');

class JobLogManager {
  constructor(projectId) {
    this.projectId = projectId;
    this.uploadUrl = '';
    this.uploadPath = '';
  }

  getUploadInfo(token) {
    return katalonRequest.getUploadInfo(token, this.projectId)
      .then((response) => {
        if (!response || !response.body) {
          return null;
        }

        const { body } = response;
        this.uploadUrl = body.uploadUrl;
        this.uploadPath = body.path;

        return body;
      });
  }

  uploadFile(token, jobInfo, filePath) {
    if (!this.uploadUrl) {
      throw new Error('Unable to upload file: No upload url.');
    }
    jobInfo.uploadPath = this.uploadPath;

    return katalonRequest.uploadFile(this.uploadUrl, filePath)
      .then(() => {
        const batch = `${new Date().getTime()}-${uuidv4()}`;
        const fileName = path.basename(filePath);
        // Update job's upload file
        return katalonRequest.saveJobLog(token, jobInfo, batch, fileName);
      });
  }

  uploadLog(token, jobInfo, filePath) {
    logger.info('Uploading job execution log...');
    return this.getUploadInfo(token)
      .then(() => this.uploadFile(token, jobInfo, filePath));
  }
}

module.exports = JobLogManager;
