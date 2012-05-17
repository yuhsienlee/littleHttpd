//Config
//引入語系檔
var msg = require('./lib/msg.js');
var config = {
  'port':  9527,
  'ip':  '127.0.0.1',
  'documentPath':  __dirname + '/www/',
  'noPage':  '404.html',
  'indexPage':  ['index.html', 'index.htm', 'index.shtml'],
  'msg':  msg
};

module.exports = config;
