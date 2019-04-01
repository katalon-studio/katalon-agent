const path = require('path');

module.exports = {
    getPath: function(relativePath) {
        return path.join(appRoot, relativePath);
    }
}
