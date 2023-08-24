const handlers = {};

handlers.notFound = (data, callback) => { callback(404); }
handlers.ping = (data, callback) => { callback(200); }

const router = {
    'ping': handlers.ping
};

module.exports = router;