const config = require('./config');

function getAuth() {
  return {
    username: '',
    password: config.apikey,
  };
}

module.exports = {
  getAuth,
};
