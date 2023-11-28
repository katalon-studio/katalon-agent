const config = require('./config');

function getAuth(apikey) {
  return {
    username: '',
    password: apikey || config.apikey,
  };
}

module.exports = {
  getAuth,
};
