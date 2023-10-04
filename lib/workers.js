/*
 *
 * Worker related tasks
 *
 */

// DEPS
const path = require('path');
const fs = require('fs');
const _data = require('./data');
const https = require('https');
const http = require('http');
const helpers = require('./helpers');
const url = require('url');
const _logs = require('./logs');

const workers = {};

workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
    const logFileName = originalCheckData?.id || originalCheckData;
    console.log(`Logging check ${logFileName} to file...`);
    
    const logString = JSON.stringify({
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    });

    _logs.appendOrCreateFile(logFileName, logString, (err) => {
        if (!err) {
            console.log("Logging to file succeeded");
        } else {
            console.log("Logging to file failed");
        }
    });
};

workers.alertUserToStatusChange = (newCheckData) => {
    const msg = `Alert: your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;

    helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) => {
        if (!err) {
            console.log('Success! User was alerted to a status change in their check.', msg)
        } else {
            console.log('Error: Could not send message to user', err)
        }
    });
};

workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    const timeOfCheck = Date.now();
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state != state ? true : false;

    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    const newCheckData = structuredClone(originalCheckData);
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    _data.update('checks', newCheckData.id, newCheckData, (err) => {
        if (!err) {
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                console.log('Check outcome has not changed, no alerts issued');
            }
        } else {
            console.log('Error trying to save updates to one of the checks:', originalCheckData, err)
        }
    });
};

workers.performCheck = (originalCheckData) => {
    const checkOutcome = {
        'error': false,
        'responseCode': false
    };

    let outcomeSent = false;

    const parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path; // Using path instead of pathname because we want the querystring

    const requestDetails = {
        'protocol': originalCheckData.protocol + ':',
        'hostname': hostName,
        'method': String(originalCheckData.method).toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    };

    const _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, (res) => {
        const status = res.statusCode;
        checkOutcome.responseCode = status;

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('error', (err) => {
        checkOutcome.error = {
            'error': true,
            'value': err
        };

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.on('timeout', (err) => {
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        };

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    req.end();
}

workers.validateCheckData = (originalCheckData) => {
    originalCheckData = typeof(originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : {};
    originalCheckData.id = typeof(originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
    originalCheckData.userPhone = typeof(originalCheckData.userPhone) == 'string' ? originalCheckData.userPhone.trim() : false;
    originalCheckData.protocol = typeof(originalCheckData.protocol) == 'string' && ['https', 'http'].includes(originalCheckData.protocol) ? originalCheckData.protocol : false;
    originalCheckData.url = typeof(originalCheckData.url) == 'string' ? originalCheckData.url.trim() : false;
    originalCheckData.method = typeof(originalCheckData.method) == 'string' && ['post', 'get', 'patch', 'delete', 'put'].includes(originalCheckData.method) ? originalCheckData.method : false;
    originalCheckData.successCodes = Array.isArray(originalCheckData.successCodes) && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
    originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 == 0 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

    originalCheckData.state = typeof(originalCheckData.state) == 'string' && ['up', 'down'].includes(originalCheckData.state) ? originalCheckData.state : 'down';
    originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

    if (
        originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds
    ) {
        workers.performCheck(originalCheckData);
    } else {
        console.log('Error: one of the checks is not properly formatted', originalCheckData, ". Skipping it.");
    }
}

workers.gatherAllChecks = () => {
    _data.list('checks', (err, checks = []) => {
        if (!err && checks.length > 0) {
            for (const check of checks) {
                _data.read('checks', check, (err, originalCheckData) => {
                    if (!err && originalCheckData) {
                        workers.validateCheckData(originalCheckData);
                    } else {
                        console.log("Error reading one of the check's data:", check);
                    }
                });
            }
        } else {
            console.log("Could not find any checks to process");
        }
    });
};

workers.loop = () => {
    setInterval(() => {
        workers.gatherAllChecks();
    }, 1000 * 5);
};

workers.rotateLogs = () => {
    console.log("Rotating logs for compression...")

    _logs.list(false, (err, logs) => {
        if (!err && logs?.length > 0) {
            for (const logName of logs) {
                const logId = logName.replace('.log', '');
                const newFileId = logId + '-' + Date.now();

                _logs.compress(logId, newFileId, (err) => {
                    if (!err) {
                        _logs.truncate(logId, (err) => {
                            if (!err) {
                                console.log("Success truncating log file");
                            } else {
                                console.log("Error truncating log file");
                            }
                        });
                    } else {
                        console.log("Error compressing one of the log files.", err);
                    }
                });
            }
        } else {
            console.log('Could not find any logs to rotate');
        }
    });
};

workers.logRotationLoop = () => {
    setInterval(() => {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
}

workers.init = () => {
    console.log("Initiating workers...");
    workers.gatherAllChecks();
    workers.loop();
    console.log('Workers running succesfully!');

    workers.rotateLogs();
    workers.logRotationLoop();
};

module.exports = workers;