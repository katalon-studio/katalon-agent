const moment = require('moment');

const api = require('../core/api');
const config = require('../core/config');
const logger = require('../config/logger');

class TokenManager {
  constructor(expiryExpectancy) {
    this.expiryExpectancy = expiryExpectancy || 0;

    this.accessToken = '';
    this.expiry = moment(); // Always expires whenever object is instantiated

    this.setToken = this.setToken.bind(this);
    this.requestAccessToken = this.requestAccessToken.bind(this);
  }

  setToken(response) {
    if (!response || !response.body) {
      throw new Error(`Unable to request access token to ${config.serverUrl}`);
    }

    const { status } = response;
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      error_description: errorDescription,
    } = response.body;

    if (status === 400 && errorDescription) {
      throw new Error(errorDescription);
    }

    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiry = moment().add({ seconds: expiresIn });

    return this.accessToken;
  }

  requestAccessToken() {
    return api.requestToken(config.email, config.apikey).then(this.setToken);
  }

  tokenWillExpired() {
    const now = moment();
    const diff = this.expiry.diff(now);
    return diff <= this.expiryExpectancy;
  }

  ensureToken() {
    const shouldRequestToken = this.tokenWillExpired();
    if (shouldRequestToken) {
      logger.info('Requesting new access token...');
      return this.requestAccessToken();
    }
    // Use previous token if it has not yet expired
    // This will not take care of the scenario where
    // token is accidentally removed due to internal error or being revoked
    return Promise.resolve(this.accessToken);
  }

  get token() {
    return this.ensureToken();
  }

  get tokenSync() {
    return this.accessToken;
  }
}

module.exports = TokenManager;
