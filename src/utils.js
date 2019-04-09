const path = require('path');

module.exports = {
  getPath(relativePath) {
    return path.join(global.appRoot, relativePath);
  },
};
