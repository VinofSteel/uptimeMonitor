/*
 * 
 * Helpers for application
 *
 */

// DEPS
const config = require('./config');
const crypto = require('crypto');

const helpers = {};

helpers.parseJsonToObject = (str) => {
    let parsedJson = {};

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

helpers.createRandomString = (strLength) => {
    strLength = typeof (strLength) === 'number' && strLength > 0 ? strLength : false;
    if (!strLength) { return false; }

    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let output = '';
    for (let i = 0; i <= strLength; i++) {
        const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

        output += randomCharacter;
    }

    return output;
}

module.exports = helpers;