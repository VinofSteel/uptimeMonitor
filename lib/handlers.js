/*
 *
 * Request Handlers
 *
 */

// DEPS
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

const handlers = {};
const acceptableMethods = ['post', 'get', 'patch', 'put', 'delete'];

handlers.ping = (data, callback) => { callback(200) };
handlers.notFound = (data, callback) => { callback(404) };
handlers._users = {};
handlers._tokens = {};
handlers._checks = {};

handlers._tokens.verifyToken = (id, phone, callback) => {
    _data.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
            const tokenDataNotExpired = tokenData?.expires > Date.now();
            const userIsTheSameAsReceivedToken = tokenData?.phone == phone;

            (userIsTheSameAsReceivedToken && tokenDataNotExpired) ? callback(true) : callback(false); 
        } else {
            console.log(`Error verifying token: ${err}`); callback(false);
        }
    });
};



// USERS
handlers.users = (data, callback) => {
    if (!acceptableMethods.includes(data?.method)) { callback(405); }

    handlers._users[data.method](data, callback);
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
                            console.log(`Error creating user: ${err}`);
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
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
                _data.read('users', phone, (err, userData) => {
                    if (!err && userData) {
                        delete userData.hashedPassword;

                        callback(200, userData);
                    } else {
                        callback(404, { 'Error': 'The specified user does not exist' });
                    }
                });
            } else {
                callback(403, { 'Error': 'Missing required token in header or token is invalid' });
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
            const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

            handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
                if (tokenIsValid) {
                    _data.read('users', phone, (err, userData) => {
                        if (!err && userData) {
                            if (firstName) { userData.firstName = firstName; }
                            if (lastName) { userData.lastName = lastName; }
                            if (password) { userData.hashedPassword = helpers.hash(password); }

                            _data.update('users', phone, userData, (err) => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    console.log(`Error deleting user: ${err}`);

                                    callback(500, { 'Error': 'Could not update the user' });
                                }
                            });
                        } else {
                            callback(404, { 'Error': 'The specified user does not exist' });
                        }
                    });
                } else {
                    callback(403, { 'Error': 'Missing required token in header or token is invalid' });
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
        const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

        handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
            if (tokenIsValid) {
                _data.read('users', phone, (err, userData) => {
                    if (!err && userData) {
                        _data.delete('users', phone, (err) => {
                            if (!err) {
                                callback(200);

                                // Deleting all users checks
                                const userChecks = Array.isArray(userData.checks) ? userData.checks : [];
                                const checksToDelete = userChecks.length;

                                if (checksToDelete > 0) {
                                    let checkDeleted = 0;
                                    let deletionErrors = false;

                                    for (let i = 0; i < checksToDelete; i++) {
                                        const checkId = checksToDelete[i];

                                        _data.delete('checks', checkId, (err) => {
                                            if (!err) { deletionErrors = true; }
                                            checkDeleted++;

                                            if (checkDeleted == checksToDelete) {
                                                if (!deletionErrors) {
                                                    callback(200);
                                                } else {
                                                    callback(500, { 'Error': 'Errors encountered while attempting to delete all of the users checks, all checks may not have been deleted from the server correctly' });
                                                }
                                            }
                                        })
                                    }
                                } else {
                                    callback(200);
                                }
                            } else {
                                callback(500, { 'Error': 'Could not delete user' });
                            }
                        });
                    } else {
                        callback(404, { 'Error': 'The specified user does not exist' });
                    }
                });
            } else {
                callback(403, { 'Error': 'Missing required token in header or token is invalid' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' })
    }
};

// TOKENS
handlers.tokens = (data, callback) => {
    if (!acceptableMethods.includes(data?.method)) { callback(405); }

    handlers._tokens[data.method](data, callback);
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
    const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        _data.read('tokens', id, (err, userData) => {
            if (!err && userData) {
                _data.delete('tokens', id, (err) => {
                    if (!err) {
                        callback(200)
                    } else {
                        callback(500, { 'Error': 'Could not delete token' });
                    }
                });
            } else {
                callback(404, { 'Error': 'The specified token does not exist' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' })
    }
};

handlers.checks = (data, callback) => {
    if (!acceptableMethods.includes(data?.method)) { callback(405); }

    handlers._checks[data.method](data, callback);
};

handlers._checks.post = (data, callback) => {
    const protocol = typeof (data?.payload?.protocol) == 'string' && ['https', 'http'].includes(data?.payload?.protocol) ? data.payload.protocol : false;
    const url = typeof (data?.payload?.url) == 'string' && data?.payload?.url.length > 0 ? data.payload.url.trim() : false;
    const method = typeof (data?.payload?.method) == 'string' && ['post', 'get', 'patch', 'delete'].includes(data?.payload?.method) ? data.payload.method : false;
    const successCodes = Array.isArray(data?.payload?.successCodes) && data?.payload?.successCodes?.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds = typeof (data?.payload?.timeoutSeconds) == 'number' && data?.payload?.timeoutSeconds % 1 == 0 && data?.payload?.timeoutSeconds >= 1 && data?.payload?.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes && timeoutSeconds) {
        const token = typeof data?.headers?.token == 'string' ? data.headers.token : false;

        _data.read('tokens', token, (err, tokenData) => {
            if (!err && tokenData) {
                const userPhone = tokenData.phone;

                _data.read('users', userPhone, (err, userData) => {
                    if (!err && userData) {
                        const userChecks = Array.isArray(userData.checks) ? userData.checks : [];
                        if (userChecks.length < config.maxChecks) {
                            const checkId = helpers.createRandomString(20);

                            const checkObject = {
                                'id': checkId,
                                'userPhone': userPhone,
                                'protocol': protocol,
                                'url': url,
                                'method': method,
                                'successCodes': successCodes,
                                'timeoutSeconds': timeoutSeconds
                            }

                            _data.create('checks', checkId, checkObject, (err) => {
                                if (!err) {
                                    userData.checks = userChecks;
                                    userData.checks.push(checkId);

                                    _data.update('users', userPhone, userData, (err) => {
                                        if (!err) {
                                            callback(200, checkObject);
                                        } else {
                                            callback(500, { 'Error': 'Could not update user with the new check' });
                                        }
                                    });
                                } else {
                                    callback(500, { 'Error': 'Could not create check' });
                                }
                            });
                        } else {
                            callback(400, { 'Error': `The user already has the maximum number of checks (${config.maxChecks})` })
                        }
                    } else {
                        callback(403, { 'Error': 'Missing required token in header or token is invalid' });
                    }
                });
            } else {
                callback(403, { 'Error': 'Missing required token in header or token is invalid' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required inputs or inputs are invalid' });
    }
};

handlers._checks.get = (data, callback) => {
    const id = typeof (data?.queryStringObject?.id) == 'string' && data?.queryStringObject?.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
                const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        callback(200, checkData);
                    } else {
                        callback(403, { 'Error': 'Missing required token in header or token is invalid' });
                    }
                });
            } else {
                callback(404, { 'Error': 'The specified check does not exist' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' })
    }
};

handlers._checks.patch = (data, callback) => {
    const id = typeof (data?.payload?.id) == 'string' && data?.payload?.id.trim().length == 20 ? data.payload.id.trim() : false;

    const protocol = typeof (data?.payload?.protocol) == 'string' && ['https', 'http'].includes(data?.payload?.protocol) ? data.payload.protocol : false;
    const url = typeof (data?.payload?.url) == 'string' && data?.payload?.url.length > 0 ? data.payload.url.trim() : false;
    const method = typeof (data?.payload?.method) == 'string' && ['post', 'get', 'patch', 'delete'].includes(data?.payload?.method) ? data.payload.method : false;
    const successCodes = Array.isArray(data?.payload?.successCodes) && data?.payload?.successCodes?.length > 0 ? data.payload.successCodes : false;
    const timeoutSeconds = typeof (data?.payload?.timeoutSeconds) == 'number' && data?.payload?.timeoutSeconds % 1 == 0 && data?.payload?.timeoutSeconds >= 1 && data?.payload?.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (id) {
        if (protocol || url || method || successCodes || timeoutSeconds) {
            _data.read('checks', id, (err, checkData) => {
                if (!err && checkData) {
                    const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;
                    handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                        if (tokenIsValid) {
                            if (protocol) { checkData.protocol = protocol; }
                            if (url) { checkData.url = url; }
                            if (method) { checkData.method = method; }
                            if (successCodes) { checkData.successCodes = successCodes; }
                            if (timeoutSeconds) { checkData.timeoutSeconds = timeoutSeconds; }

                            _data.update('checks', id, checkData, (err) => {
                                if (!err) {
                                    callback(200);
                                } else {
                                    callback(500, { 'Error': 'Could not update the specified check' });
                                }
                            });
                        } else {
                            callback(403, { 'Error': 'Missing required token in header or token is invalid' });
                        }
                    });
                } else {
                    callback(404, { 'Error': 'The specified check does not exist' });
                }
            });
        } else {
            callback(400, { 'Error': 'Missing fields to update' });
        }
    } else {
        callback(400, { 'Error': 'Missing required field' });
    }
};

handlers._checks.delete = (data, callback) => {
    const id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length == 20 ? data.queryStringObject.id.trim() : false;

    if (id) {
        _data.read('checks', id, (err, checkData) => {
            if (!err && checkData) {
                const token = typeof (data.headers.token) == 'string' ? data.headers.token : false;

                handlers._tokens.verifyToken(token, checkData.userPhone, (tokenIsValid) => {
                    if (tokenIsValid) {
                        _data.delete('checks', id, (err) => {
                            if (!err) {
                                _data.read('users', checkData.userPhone, (err, userData) => {
                                    if (!err && userData) {
                                        const userChecks = Array.isArray(userData.checks) ? userData.checks : [];
                                        const checkPosition = userChecks.indexOf(id);

                                        if (checkPosition != -1) {
                                            userChecks.splice(checkPosition, 1);

                                            _data.update('users', checkData.userPhone, userData, (err) => {
                                                if (!err) {
                                                    callback(200)
                                                } else {
                                                    callback(500, { 'Error': 'Could not update the user' });
                                                }
                                            });
                                        } else {
                                            callback(500, { 'Error': 'Could not find check on user object, so could not remove it' });
                                        }
                                    } else {
                                        callback(500, { 'Error': 'Could not find the user who created the check, check not removed from user object' });
                                    }
                                });
                            } else {
                                callback(500, { 'Error': 'Could not delete check' });
                            }
                        });
                    } else {
                        callback(403, { 'Error': 'Missing required token in header or token is invalid' });
                    }
                });
            } else {
                callback(404, { 'Error': 'The specified check does not exist' });
            }
        });
    } else {
        callback(400, { 'Error': 'Missing required field' })
    }
};

module.exports = handlers;