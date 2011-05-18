require.paths.unshift('./node_modules/markdown/lib');
var fs = require('fs')
  , utils = require('./utils.js')
  , path = require('path')
  , markdown = require('markdown')
  , connect = require('connect')
  , connectStatic = connect['static']
  , quip = require('quip')
  , jade = require('jade')
  , tp = {}
  , sourceDirectory = __dirname + '/tmd-source'
  , builded
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
console.log(tp.listing);

function renderJade(tpind, mdfilepath, fn) {
  fs.readFile(mdfilepath, 'utf8', function (err, mdstr) {
    if (err) return fn('not found');
    fn(null, tp[tpind]({content: markdown.makeHtml(mdstr)}));
  });
}

var router = function (app) {
  app.get('*?/', function (req, res, next) {
    req.url += 'index';
    next();
  });
  app.get('/*', function (req, res, next) {
    var filepath = req.params[0]
      , mdfilepath
      ;
    if ('.html' == Array.prototype.splice.call(filepath, -5).join('')) {
      filepath = filepath.substring(0, filepath.length - 5);
    }
    if ('.md' != Array.prototype.splice.call(filepath, -3).join('')) {
      mdfilepath = filepath + '.md';
    }
    mdfilepath = sourceDirectory + '/' + filepath;
    renderJade('document', mdfilepath, function (err, html) {
      if (err) return next();
      res.ok().html(html);
    });
  });
  app.get('/*', function (req, res, next) {
    var filepath = req.params[0];
    if ('.html' != Array.prototype.splice.call(filepath, -5).join('')) {
      filepath = filepath + '.html';
    }
    connectStatic.send(req, res, next, {
        root: __dirname + '/tmd-output'
      , path: '/' + filepath
    });
  });
  app.get('/*', function (req, res, next) {
    res.notFound('not found');
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

utils.fsfind(sourceDirectory, /.md$/, function (err, file) {
  var outputFile = __dirname + '/tmd-output' +
        file.substring(sourceDirectory.length, file.length - 3) + '.html'
    , fileDir = file.substring(0, file.lastIndexOf('/'))
    , _dirs = []
    , _mds = []
    , _files = []
    ;
  if (!path.exists(fileDir + '/tmd-listing.html')) {
    fs.readdir(fileDir, function (err, files) {
      var html, listfilename, childhtmlname;
      if (err) return console.log('error generating '+fileDir+'/tmd-listing.html');
      files.forEach(function (child) {
        if (fs.statSync(fileDir+'/'+child).isDirectory()) _dirs.push({href:child, title:child});
        else if (fs.statSync(fileDir+'/'+child).isFile() && child.match(/.md$/)) {
          childhtmlname = child.substring(0, child.lastIndexOf('.'))+'.html';
          _mds.push({href:childhtmlname, title:childhtmlname});
        }
        else if (fs.statSync(fileDir+'/'+child).isFile()) _files.push({href:child, title:child});
      });
      html = tp.listing({docs:_mds, dirs:_dirs, files: _files});
      console.log(html);
      listfilename = outputFile.substring(0, outputFile.lastIndexOf('/'))+'/tmd-listing.html';
      console.log(listfilename);
      fs.writeFile(listfilename, html, function (err) {
        if (err) console.log(err);
      });
    });
  }
  utils.mkdir_p(outputFile.substring(0, outputFile.lastIndexOf('/')));
  renderJade('document', file, function (err, html) {
    fs.writeFile(outputFile, html, function (err) {
      if (err) console.log(err);
    });
  });
});
