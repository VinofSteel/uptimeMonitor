/*
 *
 * Server related tasks
 *
 */

// DEPS
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers = require('./handlers');
const helpers = require('./helpers');
const path = require('path');

const server = {};

server.httpServer = http.createServer((req, res) => { server.unifiedServer(req, res) });

server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => { server.unifiedServer(req, res) });

server.unifiedServer = (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');
    const queryStringObject = parsedUrl.query; //@TODO change this to a dynamic generation using Object.keys/values

    const method = req.method.toLowerCase();
    const headers = req.headers;

    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    req.on('data', (data) => { buffer += decoder.write(data) });

    req.on('end', () => {
        buffer += decoder.end();

        const chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        const data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        };

        chosenHandler(data, (statusCode, payload, contentType='json') => {
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200;
            payload = typeof (payload) == 'object' ? payload : {};
            
            let payloadString = '';
            if (contentType == 'json') {
                res.setHeader('Content-Type', 'application/json');
                payload = typeof(payload) == 'object' ? payload : {};
                payloadString = JSON.stringify(payload);
            }

            if (contentType == 'html') {
                res.setHeader('Content-Type', 'text/html');
                payloadString = typeof(payload) == 'string'? payload : '';
            }

            if (contentType == 'favicon') {
                res.setHeader('Content-Type', 'image/x-icon');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            if (contentType == 'plain') {
                res.setHeader('Content-Type', 'text/plain');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            if (contentType == 'css') {
                res.setHeader('Content-Type', 'text/css');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            if (contentType == 'png') {
                res.setHeader('Content-Type', 'image/png');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            if (contentType == 'jpg') {
                res.setHeader('Content-Type', 'image/jpeg');
                payloadString = typeof(payload) !== 'undefined' ? payload : '';
            }

            res.writeHead(statusCode);
            res.end(payloadString);

            if (statusCode == 200) {
                console.log(`Succesful request on path ${trimmedPath}, with statusCode ${statusCode}!`);
            } else {
                console.log(`Failed request on path ${trimmedPath}, with statusCode ${statusCode}.`)
            }

        });

    });
};

// Define the request router
server.router = {
    '': handlers.index,
    'account/create': handlers.accountCreate,
    'account/edit': handlers.accountEdit,
    'account/deleted': handlers.accountDeleted,
    'session/create': handlers.sessionCreate,
    'session/deleted': handlers.sessionDeleted,
    'checks/all': handlers.checksList,
    'checks/create': handlers.checksCreate,
    'checks/edit': handlers.checksEdit,
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks,
    'favicon.ico' : handlers.favicon,
    'public' : handlers.public
};

server.init = () => {
    server.httpServer.listen(config.httpPort, () => { console.log('\x1b[36m%s\x1b[0m', `The HTTP server is running on port: ${config.httpPort}`); });
    server.httpsServer.listen(config.httpsPort, () => { console.log('\x1b[35m%s\x1b[0m', `The HTTPS server is running on port: ${config.httpsPort}`); });
}

module.exports = server;