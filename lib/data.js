/*
 * Library for storing and editing data
 *
 *
 */

const fs = require('fs');
const path = require('path');

const lib = {};

lib.baseDir = path.join(__dirname, '/../.data');

lib.create = (dir, file, data, callback) => {
    fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            const stringData = JSON.stringify(data);
            fs.writeFile(fileDescriptor, stringData, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback(`Error closing new file: ${er}`);
                        }
                    });
                } else {
                    callback(`Error writing to new file: ${err}`);
                }
            })
        } else {
            callback(`Could not create a new file: ${err}`)
        }
    });
};

lib.read = (dir, file, callback) => {
    fs.readFile(`${lib.baseDir}/${dir}/${file}.json`, 'utf8', (err, data) => {
        callback(err, data);
    });
};

lib.update = (dir, file, data, callback) => {
    fs.open(`${lib.baseDir}/${dir}/${file}.json`, 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            const stringData = JSON.stringify(data);
            
            fs.ftruncate(fileDescriptor, (err) => {
                if (!err) {
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, (err) => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback(`Error closing file: ${err}`);
                                }
                            });
                        } else {
                            callback(`Error writing to existing file: ${err}`)
                        }
                    })
                } else {
                    callback(`Error truncating file: ${err}`)
                }
            })
        } else {
            callback(`Could not open the file for updating: ${err}`)
        }
    });
};

lib.delete = (dir, file, callback) => {
    fs.unlinkSync(`${lib.baseDir}/${dir}/${file}.json`, (err) => {
        if (!err) {
            callback(false);
        } else {
            callback(`Error deleting file: ${err}`);
        }
    });
}

module.exports = lib;