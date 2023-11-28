const http = require('./http');
const { getAuth } = require('../auth');
const { getBasicAuthHeader } = require('./utils');

function withAuthorization(current = {}) {
  return {
    Authorization: current?.Authorization || getBasicAuthHeader(getAuth()),
    ...current,
  };
}

module.exports = {
  get(urlParam, headers) {
    return http.get(urlParam, withAuthorization(headers));
  },

  post(urlParam, data, headers) {
    return http.post(urlParam, data, withAuthorization(headers));
  },

  put(urlParam, data, headers) {
    return http.put(urlParam, data, withAuthorization(headers));
  },

  patch(urlParam, data, headers) {
    return http.patch(urlParam, data, withAuthorization(headers));
  },

  stream(urlParam, filePath, headers) {
    return http.stream(urlParam, filePath, withAuthorization(headers));
  },
};
