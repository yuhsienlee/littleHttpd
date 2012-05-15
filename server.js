var util = require('util'),
    http = require('http'),
    url  = require('url'),
    fs   = require('fs'),
    path = require('path'),
    mime = require('./lib/mime.js'),
    events = require('events').EventEmitter;
//Config-------------------------
  var config = {};
  config.port = 9527;
  config.ip = '127.0.0.1';
  config.documentPath = '/Users/unifish/src/nodeHttpd/www/';
  config.noPage = '404.html';
  config.indexPage = ['index.html', 'index.htm', 'index.shtml'];
  config.msg = [];
  config.msg[404] = 'NOT FOUND';
  config.msg[500] = 'Internal Server Error';
  config.msg[304] = 'NOT MOD';
//------------------------------

var requestHandler = function(req, res){
  var connect = new events;
      connect.req = req;
      connect.res = res;
  //debug用XD
  connect.on('log', function(){
    console.log(this);
  });
  //send header
  connect.on('sendHeader', function(stCode){
    this.stCode = stCode;
    var resHeader = {};
    switch (stCode){
      case 304:
        console.log(config.msg[stCode] + ': ' + this.fullPath);
        resHeader = {
          'Date': new Date().toString(),
          'Last-Modified': this.mtime,
          'eTag': this.eTag
        };
        this.res.writeHead(stCode, resHeader);
        break;
    }
    this.res.end();
  });

  //吐檔案
  connect.on('sendFile', function(){
    fs.readFile(this.fullPath, this.mime.charset, function(err, content){
      if (err){throw err;}
      connect.stCode = connect.stCode != undefined ? connect.stCode : 200;
      console.log(config.msg[connect.stCode] + ': ' + connect.fullPath);
      var resHeader = {
        'Cache-control': 'max-age=3600',
        'Content-Type': connect.mime.contentType,
        'Content-Length': connect.fileSize,
        'Date': new Date().toString(),
        'Last-Modified': connect.mtime,
        'eTag': connect.eTag
      };
      connect.res.writeHead(connect.stCode, resHeader);
      connect.res.write(content);
      connect.res.end();
    });
  });
  
  //轉向
  connect.on('redirect', function(stCode){
    this.stCode = stCode;
    switch (this.stCode){
      case 404:
      case 500:
        console.log(config.msg[this.stCode] + ': ' + this.fullPath + ', redirect..');
        path.exists(config.documentPath + config.noPage, function(exists){
          if (!exists){//找無page
            var msg = '404 - NOT FOUND';
            connect.res.writeHead(404, {
              'Content-Type': 'text/plian',
              'Content-Length': msg.length
            });
            connect.res.end(msg);
            return;
          }
          connect.stCode = 404;
          connect.emit('findFile', config.documentPath, config.noPage);
        });
        break;
      case 302:
        break;
    }
  });
  //查查modify
  connect.on('checkModify', function(){
    if (this.req.headers['if-modified-since'] != undefined && this.req.headers['if-none-match'] != undefined){
      var cacheTime = new Date(this.req.headers['if-modified-since']).getTime();
      var cacheEtag = this.req.headers['if-none-match'];
      var fileTime = new Date(this.mtime).getTime();
      var fileEtag = this.eTag;
      if (cacheTime >= fileTime && fileEtag == cacheEtag){//not modified
        this.emit('sendHeader', 304); 
      }else{
        this.emit('sendFile');
      }
   }else{
     this.emit('sendFile');
   }
  });
  //找檔案
  connect.on('findFile', function(path, page){
    this.requestFile = page ? page : this.requestFile;
    this.requestPath = path ? path : this.requestPath;
    this.fileExt = this.requestFile.split('.').pop();
    this.fullPath = this.requestPath + this.requestFile;
    this.mime = new mime(this.fileExt);
    fs.stat(this.fullPath, function(err, stat){
      if (err){
        connect.emit('redirect', 404);
        return;
      }
      connect.fileSize = stat.size;
      connect.mtime = stat.mtime;
      connect.eTag = new Date(stat.mtime).getTime() + stat.size;
      connect.emit('checkModify');
    });
  });

  req.on('end', function(){
    var urlObj = url.parse(req.url);
    var pathname = urlObj.pathname.split('/');
    connect.requestFile = pathname.pop();
    connect.requestPath = pathname.join('') != '' ? config.documentPath + pathname.join('') + '/' : config.documentPath;
    if (connect.requestFile == ''){//url為目錄, 找index
      config.indexPage.forEach(function(page){
        var file = connect.requestPath + page;
        path.exists(file, function(exists){
          if (exists){
            connect.emit('findFile', connect.requestPath, page);
          }
        });
      });
    }else{//url為檔案
      connect.emit('findFile');
    }
  });
}


http.createServer(requestHandler)
    .listen(config.port, config.ip);

console.log('Server is running...');
