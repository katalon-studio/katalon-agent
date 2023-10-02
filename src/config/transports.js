const _ = require('lodash');
const TransportStream = require('winston-transport');

const api = require('../core/api');

class S3FileTransport extends TransportStream {
  constructor(options = {}, afterLog) {
    super(options);
    this.filePath = options.filePath;
    this.signedUrl = options.signedUrl;
    this.parentLogger = options.logger;

    this.wait = options.wait;
    this.afterLog = afterLog;

    this.uploadToS3 = this.uploadToS3.bind(this);
    this.uploadToS3Throttled = _.throttle(this.uploadToS3, this.wait, { trailing: false });
  }

  uploadToS3() {
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
