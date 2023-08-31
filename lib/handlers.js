/*
 * Request Handlers
 *
 */

// DEPS
const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};

handlers.ping = (data, callback) => { callback(200) };
handlers.notFound = (data, callback) => { callback(404) };

handlers.users = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'patch', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};

handlers._users = {};

handlers._users.post = (data, callback) => {
    const firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 11 && data.payload.phone.trim()[3] === "9" ? data.payload.phone.trim() : false;
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        _data.read('users', phone, (err, data) => {
            if (err) {
                const hashedPassword = helpers.hash(password);

                if (hashedPassword) {
                    const userObject = {
                        'firstName': firstName,
                        'lastName': lastName,
                        'phone': phone,
                        'hashedPassword': hashedPassword,
                        'tosAgreement': true
                    };

                    _data.create('users', phone, userObject, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log('Error creating user:' ,err);
                            callback(500, { 'Error': 'Could not create the new user' });
                        }
                    });
                } else {
                    callback(500, { 'Error': 'Could not create the new user' });
                }

            } else {
                callback(400, { 'Error': 'A user with that phone number already exists' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required fields' });
    }
};

handlers._users.get = function (data, callback) {
    const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 11 ? data.queryStringObject.phone.trim() : false;
    
    if (phone) {
        _data.read('users', phone, function (err, data) {
            if (!err && data) {
                delete data.hashedPassword;

                callback(200, data);
            } else {
                callback(404, { 'Error': 'The specified user does not exist' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' })
    }
};

handlers._users.patch = (data, callback) => {
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 11 ? data.payload.phone.trim() : false;

    const firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone) {
        if (firstName || lastName || password) {
            _data.read('users', phone, (err, userData) => {
                if (!err && userData) {
                    if (firstName) { userData.firstName = firstName; }
                    if (lastName) { userData.lastName = lastName; }
                    if (password) { userData.hashedPassword = helpers.hash(password); }

                    _data.update('users', phone, userData, (err) => {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log('Error deleting user:', err);

                            callback(500, { 'Error': 'Could not update the user' });
                        }
                    });
                } else {
                    callback(404, { 'Error': 'The specified user does not exist' });
                }
            });
        } else {
            callback(400, { 'Error': 'Missing fields to update' });
        }
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

handlers._users.delete = (data, callback) => {
    const phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 11 ? data.queryStringObject.phone.trim() : false;

    if (phone) {
        _data.read('users', phone, function (err, data) {
            if (!err && data) {
                _data.delete('users', phone, (err) => {
                    if (!err) {
                        callback(200)
                    } else {
                        console.log(err)

                        callback(500, { 'Error': 'Could not delete user' });
                    }
                });
            } else {
                callback(404, { 'Error': 'The specified user does not exist' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' })
    }
};

module.exports = handlers;