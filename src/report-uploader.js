'use strict';
var RSVP = require('rsvp');
var utils = require('./utils');
var request = require('request');
var logger = require('./logger');
const uuidv4 = require('uuid/v4');
var path = require('path');
var fs =require('fs');
var _ = require('lodash');
var find = require('find');
var config = require('./config');
var katalonRequest = require('./katalon-request');

var Promise = RSVP.Promise;
const logExtension=/.*[^\.har]$/
const harExtension=/.*\.(har)$/
// const uploadInfoOutPath=ka_upload_info.json
const oauth2 = {
  grant_type: "password",
  client_secret: "kit_uploader",
  client_id: "kit_uploader"
}



module.exports = {
  upload: (folderPath) => {
    const {email, password, projectId} = config;
    const harFiles = find.fileSync(harExtension, folderPath);
    const logFiles = find.fileSync(logExtension, folderPath);
    const batch = new Date().getTime() + "-" + uuidv4();

    let uploadPromises = [];

    katalonRequest.requestToken(email, password)
    .then(response => {
      const token = response.body.access_token;
      
      for (let i = 0; i < logFiles.length -1; i++) {
        const filePath = logFiles[i];
        const promise = katalonRequest.getUploadInfo(token, projectId).then(({body}) => {
          const uploadUrl = body.uploadUrl;
          const uploadPath = body.path;
          const fileName = path.basename(filePath);
          const folderPath = path.dirname(filePath);
          return katalonRequest.uploadFile(uploadUrl, filePath)
            .then(() => katalonRequest.uploadFileInfo(token, projectId, batch, folderPath, fileName, uploadPath, false))
        });
        uploadPromises.push(promise);
      };

      Promise.all(uploadPromises).then(() => {
        const filePath = logFiles[logFiles.length - 1];
        katalonRequest.requestToken(email, password)
          .then(response => {
            const token = response.body.access_token;
            return katalonRequest.getUploadInfo(token, projectId).then(({body}) => {
              const uploadUrl = body.uploadUrl;
              const uploadPath = body.path;
              const fileName = path.basename(filePath);
              const folderPath = path.dirname(filePath);
              return katalonRequest.uploadFile(uploadUrl, filePath)
                .then(() => katalonRequest.uploadFileInfo(token, projectId, batch, folderPath, fileName, uploadPath, true))
            });
          });
      });
    });


  }
}