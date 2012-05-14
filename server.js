var util = require('util'),
    http = require('http'),
    url  = require('url'),
    fs   = require('fs'),
    path = require('path');
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
  var contentType = fileObj.contentType;
  var charSet = fileObj.charSet;
  var contentLength = fileObj.size;
  var content = fs.readFileSync(file, charSet);
  var lastModify = fileObj.mtime;
  switch (stCode){
    case 404:
    case 200:
      res.setHeader('Cache-control',  'max-age=3600');
      res.setHeader('Content-Type', contentType);
      if (charSet != ''){
        res.setHeader('charset=', charSet);
      }
      res.setHeader('Content-Length', contentLength);
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Date', new Date().toString());
      res.setHeader('Last-Modified', lastModify);
      res.write(content);
      break;
    case 304:
      res.setHeader('Last-Modified', lastModify);
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

  //判斷contentType 和charset, 未來考慮抽出來
  this.getContentData = function(file, type){
    var fileType = path.basename(file).split('.').pop();
    var contentType, charSet = null;
    switch (fileType){
      case 'html':
      case 'htm':
        contentType = 'text/html';
        charSet = 'utf-8';
        break;
      case 'js':
        contentType = 'application/x-javascript';
        charSet = 'utf-8';
        break;
      case 'css':
        contentType = 'text/css';
        charSet = 'utf-8';
        break;
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'ico':
        contentType = 'image/x-icon';
        break;
      default:
        contentType = 'text/plain';
        charSet = 'utf-8';
        break;
    }
    if (type == 'contentType'){
      return contentType;
    }else{
      return charSet;
    }
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
  this.contentType = this.getContentData(this.fullFilePath, 'contentType'); 
  this.charSet = this.getContentData(this.fullFilePath, 'charSet'); 
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
