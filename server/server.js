/*
 * Joining server logic in one global function that can be used for multiple servers.
 * The intent here is that I can create multiple servers without having to repeat the same logic (in this case, an HTTP one and an HTTPS one).
 *
 */

const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const router = require('./router');

const server = (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const trimmedPath = parsedUrl.pathname.replace(/^\/+|\/$/g, '');

    const queryStringObject = parsedUrl.query;
    const method = req.method.toLowerCase();
    const headers = req.headers;

    const decoder = new StringDecoder("utf-8");
    let buffer = '';

    req.on('data', (data) => { buffer += decoder.write(data) });

    req.on('end', () => {
        buffer += decoder.end();

        const chosenHandler = router[trimmedPath] ? router[trimmedPath] : handlers.notFound;
        const data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': buffer
        };

        chosenHandler(data, (statusCode, payload) => {
            statusCode = typeof (statusCode) !== 'number' ? statusCode = 200 : statusCode;
            payload = typeof (payload) !== 'object' ? {} : payload;

            const payloadString = JSON.stringify(payload);

            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            console.log(`Req response: ${statusCode}, ${payloadString}`);
        });

    });
};

module.exports = server;