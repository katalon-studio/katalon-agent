const http = require('./http');
const config = require('./config');
const fs = require('fs')

const TOKEN_URI = "/oauth/token";
const UPLOAD_URL_URI = "/api/v1/files/upload-url";

const oauth2 = {
  grant_type: "password",
  client_secret: "kit_uploader",
  client_id: "kit_uploader"
};

module.exports = {
  requestToken: function(email, password) {
    const data = {
      username: email,
      password: password,
      grant_type: oauth2.grant_type
    }
    var options = {
      auth: {
        username: oauth2.client_id,
        password: oauth2.client_secret
      },
      form: data,
      json: true
    };
    return http.makeRequest(config.serverUrl, TOKEN_URI, options, 'post');
  },

  getUploadInfo: function(token, projectId) {
    const options = {
      auth: {
        bearer: token
      },
      json: true,
      qs: {
        projectId
      },
    }
    return http.makeRequest(config.serverUrl, UPLOAD_URL_URI, options, 'get');
  },

  uploadFile: function(uploadUrl, fileStream) {
    return http.uploadToS3(uploadUrl, fileStream);
  }
}