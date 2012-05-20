/*
  mime.js
  取得contentType和charset
*/
var fs = require('fs');

var mimeObj = function(type){
  var mimeObj = this;
  this.contentType = null;
  this.charset = null;
  this.mimeMap = [];
  this.mimeMap['default'] = 'application/binary';
  
  var content = fs.readFileSync('./lib/type.list', 'utf-8');
  var lines = content.split('\n');
  lines.forEach(function(line){
    if (line != ''){
      var mimeData = line.split(',');
      mimeObj.mimeMap[mimeData[0]] = mimeData[1];
    }
  });

  this.find = function(mimeType){
    mimeType = mimeType.toLowerCase();
    var result = {};
    result.contentType = this.mimeMap[mimeType] == 'undefined' ? this.mimeMap['default'] : this.mimeMap[mimeType];
    result.charset = (/^text\//).test(result.contentType) ? 'UTF-8' : false;
    return result;
  }
}

var mime = new mimeObj;

module.exports = mime;
