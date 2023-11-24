const config = require('./config');

function getAuth(password) {
  return {
    username: '',
    password: password || config.apikey,
  };
}

module.exports = {
  getAuth,
};
