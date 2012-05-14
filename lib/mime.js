var fs = require('fs');

var mime = function(type){
  
  this.contentType = function(mimeType){

    var contentType;
    mimeType = mimeType.toLowerCase();
    var content = fs.readFileSync('./lib/type.list', 'utf-8');
    var mimeMap = [];
    var lines = content.split('\n');
    lines.forEach(function(line){
      if (line != ''){
        mimeData = line.split(',');
        mimeMap[mimeData[0]] = mimeData[1];
      }
    });
    mimeMap['default'] = 'application/binary';
    return mimeMap[mimeType] == 'undefined' ? 'default' : mimeMap[mimeType];
  }(type);

  this.charset = function(mimeType){
    return (/^text\//).test(mimeType) ? 'UTF-8' : false;
  }(this.contentType)
}

module.exports = mime;
