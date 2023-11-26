/*
 * 
 * Helpers for application
 *
 */

// DEPS
const config = require('./config');
const crypto = require('crypto');
const querystring = require('querystring');
const https = require('https');
const path = require('path');
const fs = require('fs');

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
    for (let i = 0; i < strLength; i++) {
        const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

        output += randomCharacter;
    }

    return output;
}

helpers.sendTwilioSms = (phone, msg, callback) => {
    phone = typeof(phone) == 'string' ? phone.trim() : false; 
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

    if (phone && msg) {
        const payload = {
            'From': config.twilio.fromPhone,
            'To': '+55'+phone,
            'Body': msg
        };

        const stringifiedPayload = querystring.stringify(payload);

        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
            'auth': `${config.twilio.accountSid}:${config.twilio.authToken}`,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringifiedPayload)
            }
        };

        const request = https.request(requestDetails, (response) => {
            const status = response.statusCode;

            if (status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Status code returned was:' + status);
            }
        });

        request.on('error', (err) => {
            callback(err);
        });

        request.write(stringifiedPayload);

        request.end();
    } else {
        callback('Given parameters were missing or invalid');
    }
}

helpers.getTemplate = (templateName, data, callback) => {
    templateName = typeof(templateName) == 'string' && templateName.length > 0 ? templateName : false;
    data = typeof(data) == 'object' && data !== null ? data : {};

    if (templateName) {
        const templatesDir = path.join(__dirname,'/../templates/');
        fs.readFile(templatesDir + templateName + '.html', 'utf8', (err, str) => {
            if (!err && str && str.length > 0) {
                const finalString = helpers.interpolate(str,data);
                callback(false, finalString);
            } else {
                callback('No template could be found');
            }
        });
    } else {
        callback('A valid template name was not specified');
    }
};
  
helpers.addUniversalTemplates = (str, data, callback) => {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};

    helpers.getTemplate('_header', data, (err, headerString) => {
        if (!err && headerString) {
            helpers.getTemplate('_footer' ,data, (err, footerString) => {
                if (!err && headerString) {
                    const fullString = headerString + str + footerString;
                    callback(false,fullString);
                } else {
                    callback('Could not find the footer template');
                }
            });
        } else {
            callback('Could not find the header template');
        }
    });
};
  
helpers.interpolate = (str, data) => {
    str = typeof(str) == 'string' && str.length > 0 ? str : '';
    data = typeof(data) == 'object' && data !== null ? data : {};

    for (const keyName in config.templateGlobals) {
        if (config.templateGlobals.hasOwnProperty(keyName)) {
            data['global.'+keyName] = config.templateGlobals[keyName];
        }
    }

    for (const key in data) {
        if(data.hasOwnProperty(key) && typeof(data[key] == 'string')) {
            const replace = data[key];
            const find = '{'+key+'}';
            str = str.replace(find,replace);
        }
    }

    return str;
};
  
helpers.getStaticAsset = (fileName, callback) => {
    fileName = typeof(fileName) == 'string' && fileName.length > 0 ? fileName : false;

    if (fileName) {
        const publicDir = path.join(__dirname, '/../public/');
        fs.readFile(publicDir + fileName, (err, data) => {
            if (!err && data) {
                callback(false,data);
            } else {
                callback('No file could be found');
            }
        });
    } else {
      callback('A valid file name was not specified');
    }
};

module.exports = helpers;