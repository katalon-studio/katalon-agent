const _ = require('lodash');
const path = require('path');
const moment = require('moment');
const TransportStream = require('winston-transport');

const { generateUuid } = require('../helper/agent');
const api = require('../core/api');

class S3FileTransport extends TransportStream {
  constructor(options = {}, afterLog) {
    super(options);
    this.jobInfo = options.jobInfo;
    this.apiKey = options.apiKey;
    this.filePath = options.filePath;
    this.signedUrl = options.signedUrl;
    this.parentLogger = options.logger;

    this.wait = options.wait;
    this.afterLog = afterLog;

    this.uploadToS3 = this.uploadToS3.bind(this);
    this.uploadToS3Throttled = _.throttle(this.uploadToS3, this.wait, { trailing: false });
  }

  async uploadToS3() {
    const parsedUrl = new URL(this.signedUrl);
    const params = new URLSearchParams(parsedUrl.search);

    const amzDate = params.get('X-Amz-Date');
    const amzExpires = params.get('X-Amz-Expires');

    const dateFormart = 'YYYYMMDDTHHmmss[Z]';
    const dateExpires = moment.utc(amzDate, dateFormart).toDate();
    dateExpires.setSeconds(dateExpires.getSeconds(), amzExpires * 1000);
    //  Minus more 2 minutes to ensure regenerate presigned url
    dateExpires.setSeconds(dateExpires.getSeconds(), -(2 * 60 * 1000));

    const now = new Date();
    if (dateExpires < now) {
      const requestGetUploadInfo = async () => {
        const response = await api.getUploadInfo(this.jobInfo.projectId, this.apiKey);
        if (!response || !response.body) {
          return null;
        }
        const { body } = response;
        const { uploadUrl } = body;
        this.signedUrl = uploadUrl;
        const batch = generateUuid();
        const fileName = path.basename(this.filePath);
        return api.saveJobLog(this.jobInfo, batch, fileName, this.apiKey);
      };
      await requestGetUploadInfo();
    }

    return api
      .uploadFile(this.signedUrl, this.filePath)
      .then(() => this.afterLog && this.afterLog())
      .catch((error) => this._handleError(error));
  }

  log(info, callback) {
    this.uploadToS3Throttled(info, callback);
    if (callback) {
      callback();
    }
  }

  _handleError(error) {
    this.parentLogger.error('Error caught during logging:', error);
  }
}

module.exports.S3FileTransport = S3FileTransport;
