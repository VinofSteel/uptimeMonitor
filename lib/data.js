/*
 *
 * Library for storing and editing data
 *
 */

// DEPS
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const crud = {};
crud.baseDir = path.join(__dirname, '/../.data/');

crud.create = (dir, file, data, callback) => {
    fs.open(crud.baseDir + dir + '/' + file + '.json', 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            const stringData = JSON.stringify(data);

            fs.writeFile(fileDescriptor, stringData, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) {
                            callback(false);
                        } else {
                            callback('Error closing new file');
                        }
                    });
                } else {
                    callback('Error writing to new file');
                }
            })
        } else {
            callback('Could not create new file, it may already exist');
        }
    })

};

crud.read = (dir, file, callback) => {
    fs.readFile(crud.baseDir + dir + '/' + file + '.json', 'utf8', (err, data) => {
        if (!err && data) {
            const parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(err, data);
        }
    })
};

crud.update = (dir, file, data, callback) => {
    fs.open(crud.baseDir + dir + '/' + file + '.json', 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            const stringData = JSON.stringify(data)

            fs.ftruncate(fileDescriptor, (err) => {
                if (!err) {
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, (err) => {
                                if (!err) {
                                    callback(false);
                                } else {
                                    callback('Error closing existing file');
                                }
                            })
                        } else {
                            callback('Error writing to existing file');
                        }
                    })
                } else {
                    callback('Error truncating file');
                }
            })
        } else {
            callback('Could not open file for updating, it may not exist yet');
        }
    })
};

crud.delete = (dir, file, callback) => {
    fs.unlink(crud.baseDir + dir + '/' + file + '.json', (err) => { callback(err) });
};

crud.list = (dir, callback) => {
    fs.readdir(crud.baseDir + dir + '/', (err, data = []) => {
        if (!err && data.length > 0) {
            const trimmedFileNames = [];

            for (const fileName of data) {
                trimmedFileNames.push(String(fileName).replace('.json', ''));
            }

            callback(false, trimmedFileNames);
        } else {
            callback(err, data);
        }
    });
};

module.exports = crud;