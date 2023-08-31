/*
 * Helpers for application
 *
 */

// DEPS
const config = require('./config');
const crypto = require('crypto');

const helpers = {};

helpers.parseJsonToObject = (str) => {
    let parsedJson = {};

    console.log(str, "STRING")

    try {
        parsedJson = JSON.parse(str);
    } catch (e) {
        console.log(e);
    }

    return parsedJson;
};

helpers.hash = (str) => {
    let hashedPassword = false;

    if (typeof (str) == 'string' && str.length > 0) {
        hashedPassword = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
    }

    return hashedPassword;
};

module.exports = helpers;