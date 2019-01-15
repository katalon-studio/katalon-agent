'use strict';
var RSVP = require('rsvp');
var url = require('url');
var utils = require('./utils');
var http = require('./http');
var request = require('request');
var fse = require('fs-extra');
var logger = require('./logger');
var fs = require('fs');
var config = require('./config');
var _ = require('lodash');
var path = require('path');

function writeGherkin(issue, fieldIds) {
  var outputDir = config.outputDir;
  var key = issue.key;
  var fields = issue.fields;
  var name = fields.summary;
  _.each(fieldIds, function(fieldId, index) {
    var content = fields[fieldId];
    if (content) {
      var number = '';
      if (index > 0) {
        number = '_' + index
      }
      var file = path.resolve(outputDir, key + '_' + name + number + '.feature');
      fse.outputFile(file, content);
    }
  })
}

module.exports = {
  getFeatures: function() {
    var jiraUrl = config.jiraUrl;
    http.makeRequest(
        jiraUrl,
        "/rest/api/2/field",
        {
          auth: {
            username: config.username,
            password: config.password
          }
        },
        "get"
    ).then(function(response) {
      var fields = response.body;
      var gherkinFields = _.flatMap(fields, function(field) {
        if (field.custom &&
          field.schema &&
          field.schema.type === 'string' &&
          field.schema.custom === 'com.atlassian.jira.plugin.system.customfieldtypes:textarea' &&
          field.name === 'Katalon BDD') {
          return field.id;
        }
        return [];
      });
      var body = {
        "jql": config.jql,
        "fields": _.concat(gherkinFields, ["summary"]),
        "maxResults": 10000,
        "startAt": 0
      };
      http.makeRequest(
          jiraUrl,
          "/rest/api/2/search",
          {
            body: body,
            auth: {
              username: config.username,
              password: config.password
            }
          },
          "post"
      ).then(function(response) {
        var result = response.body;
        var issues = result.issues;
        _.each(issues, function(issue) {
          writeGherkin(issue, gherkinFields);
        });
      });
    })
  },
}