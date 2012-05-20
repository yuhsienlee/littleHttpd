var config = require('../config.js');

var connection = function(req, res){
  var connect = this;
  this.headers = req.headers;
  this.res = res;
  this.requestPath = null;
  this.requestFile = null;
  this.fileExists = false;
  this.isRedirect = false;
  this.stCode = null;
}

module.exports = connection;
