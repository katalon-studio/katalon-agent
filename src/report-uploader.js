'use strict';
var RSVP = require('rsvp');
var utils = require('./utils');
var request = require('request');
var logger = require('./logger');
var fs =require('fs');
var _ = require('lodash');
var find = require('find');
var config = require('./config');
var katalonRequest = require('./katalon-request');

const extension=/.*\.(log|png|rp|properties|xml|json|har|uuid)$/
// const uploadInfoOutPath=ka_upload_info.json
const oauth2 = {
  grant_type: "password",
  client_secret: "kit_uploader",
  client_id: "kit_uploader"
}



module.exports = {
  upload: (folderPath) => {
    const {email, password, projectId} = config;
    find.file(extension, folderPath, function(filePath) {
      katalonRequest.requestToken(email, password)
        .then(response => katalonRequest.getUploadInfo(response.body.access_token, projectId))
        .then(response => katalonRequest.uploadFile(response.body.uploadUrl, fs.createReadStream(filePath[0])))
        .then(response => {
          console.log(response.body);
        });
    })

  }
}