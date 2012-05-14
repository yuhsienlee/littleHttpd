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
    config.noPage = config.documentPath + '404.html';
    config.indexPage = ['index.html', 'index.htm', 'index.shtml'];
//------------------------------

//吐資料給Client
var sendFile = function(res, stCode, fileObj){
  res.statusCode = stCode;
  var file = fileObj.fullFilePath;
  if (stCode == 404){
    file = config.noPage;
  }
  var contentType = !fileObj.charSet ? fileObj.contentType : fileObj.contentType + ';charset=' + fileObj.charSet;
  var resHeader;
  switch (stCode){
    case 404:
    case 200:
      var content = fs.readFileSync(file, fileObj.charSet);
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
  }
  res.end();
}

//判斷檔案更動時間
var checkModify = function(cacheTime, fileTime){
  var cacheTS = new Date(cacheTime).getTime();
  var fileTS = new Date(fileTime).getTime();
  return fileTS <= cacheTS;
}

//檔案物件
var fileObject = function(filePath, fileName){
  //若url只有目錄，找index
  this.findIndex = function(requestPath){
    var indexFile;
    var isFind = false;
    for (var i in config.indexPage){
      indexFile = requestPath + config.indexPage[i];
      if (path.existsSync(indexFile)){
        isFind = true;
        findFile = config.indexPage[i];
        break;
      }
    }
    var result = isFind ? findFile : false;
    return result;
  }
  
  this.filePath = filePath;
  this.originfileName = fileName;
  this.fileName = fileName == '' ? this.findIndex(filePath) : fileName;
  //判斷檔案存不存在
  this.isExists = function(filePath, fileName){
    if (!this.fileName){
      return false;
    }
    var result = path.existsSync(filePath + fileName) ? true : false;
    return false;
  }(this.filePath, this.fileName);

  this.indexFind = !this.isExists && this.fileName != '';
  this.fullFilePath = this.fileName ? this.filePath + this.fileName : this.filePath + this.originfileName;
  this.fileExt = this.fileName.split('.').pop();
  this.mime = new mime(this.fileExt)
  this.contentType = this.mime.contentType;
  this.charSet = this.mime.charset;
  this.mtime = fs.statSync(this.fullFilePath).mtime;
  this.size = fs.statSync(this.fullFilePath).size;
}

var requestHandler = function(req, res){
  var urlObj = url.parse(req.url);
  var pathname = urlObj.pathname.split('/'); 
  var requestFile = pathname.pop();
  var requestPath = pathname.join('') != '' ? config.documentPath + pathname.join('') + '/' : config.documentPath;
  var fileObj = new fileObject(requestPath, requestFile);
  var stCode = 200;
  if (!fileObj.isExists && !fileObj.indexFind){//檔案不存在找不到index
    console.log('Index NOT FOUND: ' + requestPath);
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
  sendFile(res, stCode, fileObj);
}

http.createServer(requestHandler)
    .listen(config.port, config.ip);

console.log('Server is running...');
