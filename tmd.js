require.paths.unshift('./node_modules/markdown/lib');
var fs = require('fs')
  , path = require('path')
  , markdown = require('markdown')
  , connect = require('connect')
  , connectStatic = connect['static']
  , quip = require('quip')
  , jade = require('jade')
  , tp = {}
  , sourceDirectory = __dirname + '/tmd-source'
  ;

['document', 'listing'].forEach(function (name, ind, list) {
  fs.readFile(__dirname + '/tmd-templates/'+name+'.jade', 'utf8', function(err, str){
    if (err) throw 'tmd-templates/'+name+'.jade could not be found';
    try {
      tp[name] = jade.compile(str);
    } catch (err) {
      throw 'error on compile tmd-templates/'+name+'.jade';
    }
  });
});

function renderJade(mdfilepath, fn) {
  fs.readFile(mdfilepath, 'utf8', function (err, mdstr) {
    if (err) return fn('not found');
    fn(null, tp.document({content: markdown.makeHtml(mdstr)}));
  });
}

var router = function (app) {
  app.get('*?/', function (req, res, next) {
    req.url += 'index';
    next();
  });
  app.get('/*', function (req, res, next) {
    var filepath = req.params[0];
    if ('.html' == Array.prototype.splice.call(filepath, -5).join('')) {
      filepath = filepath.substring(0, filepath.length - 5);
    }
    if ('.md' != Array.prototype.splice.call(filepath, -3).join('')) {
      filepath = filepath + '.md';
    }
    filepath = sourceDirectory + '/' + filepath;
    renderJade(filepath, function (err, html) {
      if (err) res.notFound(err);
      res.ok().html(html);
    });
  });
};

//dir - leading with '/' and not tailing with '/', for example '/static'
//as - what directory you want your file to be served as, for example if it was set to '/public', request of '/public/file' will get './static/file' as a result. set to '', request of '/file' will get './static/file'
var staticMiddleware = function (dir, as) {
  return function (req, res, next) {
    var ind = req.url.indexOf(as)
      , options = !ind ? {
            root: __dirname + dir
          , path: req.url.substring(as.length)
        } : null
      ;
    if (!options) return next();
    connectStatic.send(req, res, next, options);
  };
};

connect(
    quip()
  , staticMiddleware('/tmd-static', '/tmd-static')
  , connect.router(router)
).listen(3456);

//dir - default to '.'
//cond - boolean function return wether file should be handle
//callback - how this file should be handle
function fsfind(dir, cond, callback) {
  if (arguments.length < 2) throw 'at least give me a cond and a callback';
  if (typeof dir == 'function') {
    callback = cond;
    cond = dir;
    dir = '.';
  }
  fs.readdir(dir, function (err, files) {
    if (err) return callback(err);
    files
      .map(function (file) { return dir + '/' + file; })
      .forEach(function (file) {
        fs.stat(file, function (err, stat) {
          if (err) return callback(err);
          if (stat.isDirectory()) fsfind(file, cond, callback);
          else if (stat.isFile() && cond(file)) callback(null, file);
        });
      });
  });
}
function condMdFile(file) {
  return file.substring(file.lastIndexOf('/')+1).match(/.md$/);
}

function mkdir_p(dirname) {
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
}
fsfind(sourceDirectory, condMdFile, function (err, file) {
  var outputFile = __dirname + '/tmd-output' + file.substring(sourceDirectory.length, file.length - 3) + '.html';
  mkdir_p(outputFile.substring(0, outputFile.lastIndexOf('/')));
  renderJade(file, function (err, html) {
    fs.writeFile(outputFile, html, function (err) {
      if (err) console.log(err);
    });
  });
});
setTimeout(function () {
console.log(tp.listing({
    docs: [{
        href: '/'
      , title: 'Hello'
    }]
}));
}, 500);
