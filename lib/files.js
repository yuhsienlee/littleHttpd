var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    events = require('events');

var config = require('../config.js'),
    mime = require('./mime.js');

var fileObj = function(){
  var fileObj = this;
  
  //從url取得檔案狀態
  this.init = function(connect, callback){
    if (connect.requestFile == ''){//url為目錄, 找index
      fileObj.emit('findFile', connect, config.indexPage, callback);
    }else{//url為檔案
      fileObj.emit('findFile', connect, connect.requestFile, callback);
    }
  }

  //取得檔案
  this.getFile = function(connect, callback){
    var filePath = connect.requestPath + connect.requestFile;
    fileObj.emit('getStat', connect, function(){
      fs.readFile(filePath, connect.mime.charset, function(err, content){
        if (err){
          fileObj.emit('notFound', connect, callback);
          return;
        }else{
          callback(content);
        }
      });
    });
  }

  //取得檔案狀態
  this.getStats = function(connect, callback){
    fileObj.emit('getStat', connect, callback); 
  }
};
util.inherits(fileObj, events.EventEmitter);

var file = new fileObj;

file.on('findFile', function(connect, file, callback){
  var fileObj = this;
  connect.fullPath = connect.requestPath + connect.requestFile;
  if (typeof(file) == 'object'){
    var notFound = 0;
    file.forEach(function(page){
      var filePath = connect.requestPath + page;
      path.exists(filePath, function(exists){
        if (exists){
          connect.requestFile = page;
          connect.fullPath = filePath;
          fileObj.emit('Found', connect, callback);
          return;
        }else{
          notFound++
        }
        if (notFound == config.indexPage.length){//找不到index
          fileObj.emit('noIndex', connect, callback);
        }
      });
    });
  }else{
    var filePath = connect.requestPath + file;
    path.exists(filePath, function(exists){
      if (exists){
        connect.requestFile = file;
        connect.fullPath = filePath;
        fileObj.emit('Found', connect, callback);
        return;
      }else{
        fileObj.emit('notFound', connect, callback);
      }
    });
  }
});

file.on('Found', function(connect, callback){
  connect.fileExt = connect.requestFile.split('.').pop();
  connect.fileExists = true;
  connect.isRedirect = false;
  callback();
});

file.on('notFound', function(connect, callback){
  connect.fileExists = false;
  connect.isRedirect = true;
  callback();
});

file.on('noIndex', function(connect, callback){
  connect.fileExists = false;
  connect.isRedirect = true;
  callback();
});

file.on('getStat', function(connect, callback){
  var fileObj = this;
  var filePath = connect.requestPath + connect.requestFile;

  fs.stat(filePath, function(err, stats){
    if (err){
      fileObj.emit('notFound', connect, callback);
    }else{
      connect.mime = mime.find(connect.fileExt)
      connect.mtime = stats.mtime;
      connect.size = stats.size;
      connect.eTag = new Date(stats.mtime).getTime() + stats.size;
      callback();
    }
  });
})

module.exports = file;

