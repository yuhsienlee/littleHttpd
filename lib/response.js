/*
  response.js
  回傳:
    1. 吐靜態檔
    2. ...(待補)
*/
var config = require('../config.js');

var response = function(connect){
  var resHeader = {};
  switch (connect.stCode){
    case 304:
      console.log(config.msg[connect.stCode] + ': ' + connect.fullPath);
      resHeader = {
        'Date': new Date().toString(),
        'Last-Modified': connect.mtime,
        'eTag': connect.eTag
      };
      connect.res.writeHead(connect.stCode, resHeader);
      break;
    case 404:
    case 200:
      console.log(config.msg[connect.stCode] + ': ' + connect.fullPath);
      resHeader = {
        'Cache-control': 'max-age=3600',
        'Content-Type': connect.mime.contentType,
        'Content-Length': connect.size,
        'Date': new Date().toString(),
        'Last-Modified': connect.mtime,
        'eTag': connect.eTag,
        'Server': config.serverData
      };
      connect.res.writeHead(connect.stCode, resHeader);
      connect.res.write(connect.content);

      break;
  }
  connect.res.end();
}

module.exports = response;
