/*
  cache.js
  處理cache
    1. not Modified
    2. (待補完)
*/

var cacheHandler = function(){
  this.init = function(connect, callback){
    connect.stCode = 200;
    if (connect.headers['if-modified-since'] != undefined && connect.headers['if-none-match'] != undefined){
      var cacheTime = new Date(connect.headers['if-modified-since']).getTime();
      var cacheEtag = connect.headers['if-none-match'];
      var fileTime = new Date(connect.mtime).getTime();
      var fileEtag = connect.eTag;
      if (cacheTime >= fileTime && fileEtag == cacheEtag){//not modified
        connect.stCode = 304;
      }
    }
    callback();
  }
}

var cacheHandle = new cacheHandler

module.exports = cacheHandle;
