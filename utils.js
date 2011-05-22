var fs = require('fs')
  , path = require('path')
  ;
//dir - default to '.'
//expr - RegExp
//callback - how this file should be handle
exports.fsfind = function fsfind(dir, expr, callback) {
  if (arguments.length < 2) throw 'at least give me a expr and a callback';
  if (arguments.length == 2) {
    callback = expr;
    expr = dir;
    dir = '.';
  }
  fs.readdir(dir, function (err, files) {
    if (err) return callback(err);
    files
      .map(function (file) { return path.join(dir, file); })
      .forEach(function (file) {
        fs.stat(file, function (err, stat) {
          if (err) return callback(err);
          if (stat.isDirectory()) fsfind(file, expr, callback);
          else if (stat.isFile() && path.basename(file).match(expr)) {
            callback(null, file);
          }
        });
      });
  });
};

exports.mkdir_p = function (dirname) {
  if (dirname[0] != '/') throw 'dir name needs to start with "/"';
  dirnames = dirname.split('/');
  dirnames.shift();
  if (dirnames[dirnames.length] === '') dirnames.pop();
  if (dirnames.length == 0) throw 'invalid dirname';
  var t = '', i, l;
  for (i = 0, l = dirnames.length; i < l; ++i) {
    t = t + '/' + dirnames[i];
    if (path.existsSync(t)) {
      if (fs.statSync(t).isDirectory()) continue;
      else throw "'" + t + "' exists but it's not a directory";
    }
    fs.mkdirSync(t, '755');
  }
};
