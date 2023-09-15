/*
 *
 * Request Handlers
 *
 */

// DEPS
const _data = require('./data');
const helpers = require('./helpers');

const handlers = {};

handlers.ping = (data, callback) => { callback(200) };
handlers.notFound = (data, callback) => { callback(404) };
handlers._users = {};
handlers._tokens = {};

handlers.users = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'patch', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data, callback);
    } else {
        callback(405);
    }
};


handlers._users.post = (data, callback) => {
    const firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 11 && data.payload.phone.trim()[3] === "9" ? data.payload.phone.trim() : false;
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    const tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        _data.read('users', phone, (err) => {
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

handlers._users.get = (data, callback) => {
    const phone = typeof(data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length == 11 ? data.queryStringObject.phone.trim() : false;
    
    if (phone) {
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                delete userData.hashedPassword;

                callback(200, userData);
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
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                _data.delete('users', phone, (err) => {
                    if (!err) {
                        callback(200)
                    } else {
                        console.log(err);

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

handlers.tokens = (data, callback) => {
    const acceptableMethods = ['post', 'get', 'patch', 'delete'];
    if (acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data, callback);
    } else {
        callback(405);
    }
};

handlers._tokens.post = (data, callback) => {
    const phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length == 11 && data.payload.phone.trim()[3] === "9" ? data.payload.phone.trim() : false;
    const password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if (phone && password) {
        _data.read('users', phone, (err, userData) => {
            if (!err && userData) {
                const hashedPassword = helpers.hash(password);
                if (hashedPassword === userData?.hashedPassword) {
                    const tokenId = helpers.createRandomString(20);
                    const expires = Date.now() + 1000 * 60 * 60;

                    const tokenObject = {
                        'phone': phone,
                        'id': tokenId,
                        'expires': expires
                    };

                    _data.create('tokens', tokenId, tokenObject, (err) => {
                        if (!err) {
                            callback(200, tokenObject);
                        } else {
                            callback(500, { 'Error': 'Could not create new token' });
                        }
                    });
                } else {
                    callback(400, { 'Error': 'Wrong password' })
                }
            } else {
                callback(404, { 'Error': 'Could not find the specified user' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required fields' })
    }
};

handlers._tokens.get = (data, callback) => {
    const id = typeof(data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;
    
    if (id) {
        _data.read('tokens', id,  (err, tokenData) => {
            if (!err && tokenData) {
                callback(200, tokenData);
            } else {
                callback(404, { 'Error': 'The specified token does not exist' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' })
    }
};

handlers._tokens.patch = (data, callback) => {
    const id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length == 20 ? data.payload.id.trim() : false;
    const extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend == true ? true : false;

    if (id && extend) {
        _data.read('tokens', id, (err, tokenData) => {
            if (!err && tokenData) {
                if (tokenData.expires > Date.now()) {
                    tokenData.expires == Date.now() * 1000 * 60 * 60;

                    _data.update('tokens', id, tokenData, (err) => {
                        if (!err) {
                            callback(200)
                        } else {
                            callback(500, { 'Error': 'Could not update token expiration' });
                        }
                    });
                } else {
                    callback(400, { 'Error': 'The token has already expired and cannot be extended' });
                }
            } else {
                callback(404, { 'Error': 'The specified token does not exist' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field(s) our field(s) are invalid' });
    }

};

handlers._tokens.delete = (data, callback) => {

};

module.exports = handlers;