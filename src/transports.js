const fs = require('fs');
const http = require('http');
const https = require('https');
const winston = require('winston');
const TransportStream = require('winston-transport');

const katalonHttp = require('./http');
const { MESSAGE } = require('triple-beam');

class MyHttpTransport extends winston.transports.Http {
  constructor(options = {}) {
    super(options);
  }

  log(info, callback) {
    this._request(info[MESSAGE], (err, res) => {
      // if (res) {
      //   console.log('MyHttpTransport response:', res.statusCode, res.statusMessage);
      // } else {
      //   console.log('<no response>', res);
      // }

      if (res && res.statusCode !== 200) {
        err = new Error(`Invalid HTTP Status Code: ${res.statusCode}`);
      }

      if (err) {
        this.emit('warn', err);
      } else {
        this.emit('logged', info);
      }
    });

    // Remark: (jcrugzz) Fire and forget here so requests dont cause buffering
    // and block more requests from happening?
    if (callback) {
      setImmediate(callback);
    }
  }

  _request(options, callback) {
    options = options || {};

    const auth = options.auth || this.auth;
    const path = options.path || this.path || '';

    delete options.auth;
    delete options.path;

    // Prepare options for outgoing HTTP request
    const req = (this.ssl ? https : http).request({
      method: 'PUT',
      host: this.host,
      port: this.port,
      path: `/${path.replace(/^\//, '')}`,
      headers: this.headers,
      auth: auth ? (`${auth.username}:${auth.password}`) : '',
      agent: this.agent,
    });

    req.on('error', callback);
    req.on('response', res => (
      res.on('end', () => callback(null, res)).resume()
    ));
    req.end(Buffer.from(JSON.stringify(options), 'utf8'));
  }
}

class S3FileTransport extends TransportStream {
  constructor(options = {}) {
    super(options);
    this.filePath = options.filePath;
    this.signedUrl = options.signedUrl;
    this.parentLogger = options.logger;
    console.log('[[[S3FileTransport]]]', this.signedUrl, this.filePath);
  }

  log(info, callback) {
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');

      return katalonHttp.streamToS3(this.signedUrl, content)
        .then(res => console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%', res))
        .then(() => callback && callback())
        .catch(error => this._handleError(error));
    } catch (error) {
      this._handleError(error);
    }
  }

  _handleError(error) {
    this.parentLogger.error('Error caught during logging:', error);
  }
}

module.exports.MyHttpTransport = MyHttpTransport;
module.exports.S3FileTransport = S3FileTransport;
