/*
 * 
 * Library for storing and rotating logs
 *
 */

// DEPS
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const logs = {};
logs.baseDir = path.join(__dirname, '/../.logs/');

logs.appendOrCreateFile = (file, str, callback) => {
    fs.open(logs.baseDir + file + '.log', 'a', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            fs.appendFile(fileDescriptor, str + '\n', (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing file that was being appended');
                        }
                    });
                } else {
                    callback('Error appending to file');
                }
            });
        } else {
            callback('Could not open file for appending');
        }
    });
};

logs.list = (includeCompressedLogs, callback) => {
    fs.readdir(logs.baseDir, (err, data) => {
        if (!err && data && data.length > 0) {
            const trimmedFileNames = [];

            for (const fileName of data) {
                if (fileName.includes('.log')) {
                    trimmedFileNames.push(fileName.replace('.log', ''));
                }

                if (fileName.includes('.gz.b64') && includeCompressedLogs) {
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''));
                }
            }

            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    });
};

logs.compress = (logId, newFileId, callback) => {
    const sourceFile = logId + '.log';
    const destFile = newFileId + '.gz.b64';

    fs.readFile(logs.baseDir + sourceFile, 'utf8', (err, inputString) => {
        if (!err && inputString) {
            zlib.gzip(inputString, (err, buffer) => {
                if (!err && buffer) {
                    fs.open(logs.baseDir + destFile, 'wx', (err, fileDescriptor) => {
                        if (!err && fileDescriptor) {
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
                                if (!err) {
                                    fs.close(fileDescriptor, (err) => {
                                        if (!err) {
                                            callback(false);
                                        } else {
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            callback(err);
                        }
                    });
                } else {
                    callback(err);
                }
            });

        } else {
            callback(err);
        }
    });
};

logs.decompress = (fileId, callback) => {
    const fileName = fileId + '.gz.b64';
    fs.readFile(logs.baseDir + fileName, 'utf8', (err, str) => {
        if (!err && str) {
            const inputBuffer = Buffer.from(str, 'base64');
            zlib.unzip(inputBuffer, (err, outputBuffer) => {
                if (!err && outputBuffer) {
                    const str = outputBuffer.toString();
                    callback(false, str);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

logs.truncate = (logId, callback) => {
    fs.truncate(logs.baseDir + logId + '.log', 0, (err) => {
        if (!err) {
            callback(false);
        } else {
            callback(err);
        }
    });
};

module.exports = logs;