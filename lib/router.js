/*
 router.js
 處理連線流程
*/
var util = require('util'),
    events = require('events');
    url = require('url');

var config = require('../config.js'),
    conn   = require('./connection.js'),
    file   = require('./files.js'),
    cacheHandler = require('./cache.js'),
    response = require('./response.js');

var routeEvent = new events.EventEmitter;

var router = function(req, res){
  var connect = new conn(req, res);
  
  req.on('data', function(chunk){
    connect.rawPost+= chunk;
  });
  
  req.on('end',function(){
    var urlObj = url.parse(req.url);
    var pathname = urlObj.pathname.split('/');
    connect.requestFile = pathname.pop();
    pathname = removeRelativePath(pathname);//url相對路徑處理
    connect.requestPath = config.documentPath + pathname.join('/');
    if (connect.requestPath.charAt(connect.requestPath.length) != '/'){
      connect.requestPath+= '/';
    }
    routeEvent.emit('fileInit', connect);
  });
}

routeEvent.on('fileInit', function(connect){
  file.init(connect, function(){
    if (connect.fileExists){
      connect.stCode = connect.stCode ? connect.stCode : 200;
      routeEvent.emit('cacheHandle', connect);
    }else if(connect.fileExists && connect.isRedirect){
      routeEvent.emit('redirect', connect, config.documentPath, config.noPage);
    }else if (!connect.fileExists && connect.isRedirect){
      routeEvent.emit('noPage', connect);
    }else{
      connect.stCode = 500;
    }
  });
});

routeEvent.on('noPage', function(connect){
  connect.requestPath = config.documentPath;
  connect.requestFile = config.noPage;
  file.init(connect, function(){
    if (connect.fileExists){
      routeEvent.emit('getFile', connect);
    }else{
      connect.content = '404 - not found';
      connect.mime = {};
      connect.mime.contentType = 'text/plain';
      connect.mime.charset = 'UTF-8';
      connect.size = connect.content.length;
      connect.mtime = new Date().getTime();
      connect.eTag = connect.mtime + connect.size;
      routeEvent.emit('response', connect);
    }
  });
});

routeEvent.on('redirect', function(connect, redirectPath, redirectFile){
  connect.requestPath = redirectPath;
  connect.requestFile = redirectFile;
  routeEvent.emit('getFile', connect);
});

routeEvent.on('cacheHandle', function(connect){
  file.getStats(connect, function(){
    cacheHandler.init(connect, function(){
      if (connect.stCode == 304){
          routeEvent.emit('response', connect);
      }else{
        routeEvent.emit('getFile', connect);
      }
    });
  });
});

routeEvent.on('getFile', function(connect){
  file.getFile(connect, function(content){
    connect.content = content;
    routeEvent.emit('response', connect);
  });
});

routeEvent.on('response', function(connect){
  response(connect);
});

module.exports = router;

function removeRelativePath(pathname){
  var pathAssem = [];
  while (true){
    var pathCurrent = pathname.shift();
    switch (pathCurrent){
      case '':
      case '.':
        break;
      case '..':
        if (pathAssem.length > 0){
          pathAssem.shift();
        }
        break;
      default:
        pathAssem.push(pathCurrent)
          break;
    }
    if (pathname.length == 0){
      break;
    }
  }
  return pathAssem;
}
