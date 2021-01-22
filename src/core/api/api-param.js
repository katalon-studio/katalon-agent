const config = require('../config');
const { TESTOPS_BASE_URL } = require('./constants');

class ApiParam {
  constructor(path, { baseUrl, params = {}, data = {}, headers = {} } = {}) {
    this.path = path;
    this.baseUrl = baseUrl;
    this.params = params;
    this.data = data;
    this.headers = headers;
  }
}

class TestOpsApiParam extends ApiParam {
  constructor(path, { params = {}, data = {} }) {
    super(path, {
      baseUrl: config.serverUrl || TESTOPS_BASE_URL,
      params,
      data,
    });
  }
}

module.exports = {
  ApiParam,
  TestOpsApiParam,
};
