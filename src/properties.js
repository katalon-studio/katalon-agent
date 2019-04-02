const fse = require('fs-extra');
const logger = require('./logger');
const properties = require('properties');

function writeProperties(propertiesFile, prop) {
    fse.ensureFileSync(propertiesFile);
    properties.stringify(prop, { path: propertiesFile, }, (err, str) => {
        if (err) {
            return logger.error(err);
        }

        logger.trace("Write properties:\n", str);
    });
}

module.exports.writeProperties = writeProperties;