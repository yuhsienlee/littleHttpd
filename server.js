var http = require('http');

var config = require('./config.js'),
    router = require('./lib/router.js');

http.createServer(router)
    .listen(config.port, config.ip);

console.log('Server is running...');
