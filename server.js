var util = require('util'),
    http = require('http'),
    url  = require('url'),
    fs   = require('fs'),
    path = require('path'),
    mime = require('./lib/mime.js');
//Config-------------------------
var config = {};
    config.port = 9527;
    config.ip = '127.0.0.1';
    config.documentPath = '/Users/unifish/node/www/';
    config.noPage = '404.html';
    config.indexPage = ['index.html', 'index.htm', 'index.shtml'];
//------------------------------

//吐資料給Client
var sendFile = function(res, stCode, fileObj){
  res.statusCode = stCode;
  var file = fileObj.fullFilePath;
  var contentType = !fileObj.charSet ? fileObj.contentType : fileObj.contentType + ';charset=' + fileObj.charSet;
  fs.readFile(file, fileObj.charSet, function(err, content){
    var resHeader;
    switch (stCode){
      case 404:
      case 200:
        resHeader = {
          'Cache-control': 'max-age=3600',
          'Content-Type': contentType,
          'Content-Length': fileObj.size,
          'Date': new Date().toString(),
          'Last-Modified': fileObj.mtime
        };
        res.writeHead(stCode, resHeader);
        res.write(content);
        break;
      case 304:
        resHeader = {
          'Date': new Date().toString(),
          'Last-Modified': fileObj.mtime
        };
        res.writeHead(stCode, resHeader);
        break;
      case 500:
        resHeader = {
          'Content-Type': 'text/plian',
        } 
        res.writeHead(stCode, resHeader);
        res.write('500 - InternalServer Error');
      }
      res.end();
  });
}

//判斷檔案更動時間
var checkModify = function(cacheTime, fileTime){
  var cacheTS = new Date(cacheTime).getTime();
  var fileTS = new Date(fileTime).getTime();
  return fileTS <= cacheTS;
}

//檔案物件
var fileObject = function(filePath, fileName){
  this.filePath = filePath;
  this.fileName = fileName;

  //判斷檔案存不存在
  this.isExists = function(filePath, fileName){
    if (!fileName){
      return false;
    }
    var result = path.existsSync(filePath + fileName);
    return result;
  }(this.filePath, this.fileName);

  this.fullFilePath = this.filePath + this.fileName;
  this.fileExt = this.isExists ? this.fileName.split('.').pop() : null;
  this.mime = this.isExists ? new mime(this.fileExt) : null;
  this.contentType = this.isExists ? this.mime.contentType : null;
  this.charSet = this.isExists ? this.mime.charset : null;
  this.mtime = this.isExists ? fs.statSync(this.fullFilePath).mtime : null;
  this.size = this.isExists ? fs.statSync(this.fullFilePath).size : null;
}

var requestHandler = function(req, res){
  var urlObj = url.parse(req.url);
  var pathname = urlObj.pathname.split('/'); 
  var requestFile = pathname.pop();
  var requestPath = pathname.join('') != '' ? config.documentPath + pathname.join('') + '/' : config.documentPath;
  var redirect = 0;//不需轉向
  if (requestFile == ''){//為目錄, findIndex
     redirect = 1;//需轉向
     for (var i in config.indexPage){
       if (path.existsSync(requestPath + config.indexPage[i])){
        requestFile = config.indexPage[i];
        redirect = 2;//有轉向
        console.log('redirect to ' + requestFile);
        break;
       }
     }
  }
  var fileObj = new fileObject(requestPath, requestFile);
  var stCode = 200;
  if (!fileObj.isExists){//檔案不存在 or 轉向找不到index
    if (redirect == 0){
      console.log('NOT FOUND');
    }else if (redirect == 1){
      console.log('Index NOT FOUND: ' + requestPath);
    }
    //轉向404
    fileObj = new fileObject(config.documentPath, config.noPage);
    stCode = 404;
  }else{//檔案存在
    if (req.headers['if-modified-since'] != undefined){
      var cacheTime = req.headers['if-modified-since'];
      var fileTime = fileObj.mtime;
      if (checkModify(cacheTime, fileTime)){//not modified
        console.log('NOT MOD: ' + fileObj.fullFilePath);
        stCode = 304;
      }else{//200 OK
        console.log('GET: ' + fileObj.fullFilePath);
      }
    }else{//200 OK
      console.log('GET: ' + fileObj.fullFilePath);
    }
  }
  //輸出
  //console.log(fileObj);
  sendFile(res, stCode, fileObj);
}

http.createServer(requestHandler)
    .listen(config.port, config.ip);

console.log('Server is running...');
