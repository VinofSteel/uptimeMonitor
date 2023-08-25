/*
 * Primary file for the API
 *
 *
 */

const http = require('http');
const https = require('https');
const config = require('./server/config');
const fs = require('fs');
const server = require('./server/server');

//HTTP SERVER
const httpPort = config?.httpPort ?? 3000;
const httpServer = http.createServer((req, res) => {
    server(req, res);
});
httpServer.listen(httpPort, () => { console.log(`Server is listening on port ${httpPort} in ${config?.envName} mode`) });

//HTTPS SERVER
const httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    server(req, res);
});

const httpsPort = config?.httpsPort ?? 3000;
httpsServer.listen(httpsPort, () => { console.log(`Server is listening on port ${httpsPort} in ${config?.envName} mode`) });