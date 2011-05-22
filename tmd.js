require.paths.unshift(__dirname + '/node_modules/markdown/lib');
var fs = require('fs')
  , utils = require('./utils.js')
  , path = require('path')
  , markdown = require('markdown')
  , connect = require('connect')
  , connectStatic = connect['static']
  , quip = require('quip')
  , jade = require('jade')
  , tp = {}
  , configDirPath = path.resolve('.')
  , configDirLastTry
  , config
  , builded
  ;

while (configDirLastTry != configDirPath) {
  try {
    config = require(configDirPath + '/config');
  } catch (e) {}
  if (config) break;
  configDirLastTry = configDirPath;
  configDirPath = path.dirname(configDirPath);
}
if (!config) throw 'config.js not found';
var srcDir = config.dir.source
  , tplDir = config.dir.template
  , outDir = config.dir.output
  ;

['document', 'listing'].forEach(function (name, ind, list) {
  try {
    tp[name] = jade.compile(fs.readFileSync(
        path.join(config.dir.template, name + '.jade'), 'utf8'));
  } catch (err) {
    throw 'error on compile ' + path.join(config.dir.template, name + '.jade');
  }
});

function renderJade(tpind, mdfilepath, fn) {
  fs.readFile(mdfilepath, 'utf8', function (err, mdstr) {
    if (err) return fn('not found');
    fn(null, tp[tpind]({content: markdown.makeHtml(mdstr)}));
  });
}

var router = function (app) {
    /*
  app.get('/*', function (req, res, next) {
      if ( req.url[req.url.length - 1] == '/') return next();
      if (!path.exists(path.join(config.dir.source, req.params[0] + '.md'))) {
          res.redirect(req.url + '/');
      }
  });
  */
  app.get('/*', function (req, res, next) {
    console.log(req.url);
    var mdFilePath = path.join( srcDir, req.params[0] + '.md');
    renderJade('document', mdFilePath, function (err, html) {
      if (err) return res.notFound('notFound');
      res.ok().html(html);
    });
  });
  /*
  app.get('/*', function (req, res, next) {
    var filepath = req.params[0];
    if ('.html' != Array.prototype.splice.call(filepath, -5).join('')) {
      filepath = filepath + '.html';
    }
    connectStatic.send(req, res, next, {
        root: config.dir.output
      , path: '/' + filepath
    });
  });
  */
  app.get('/*', function (req, res, next) {
    res.notFound('not found');
  });
};

//dir - leading with '/' and not tailing with '/', for example '/static'
//as - what directory you want your file to be served as, for example if it was set to '/public', request of '/public/file' will get './static/file' as a result. set to '', request of '/file' will get './static/file'
var staticMiddleware = function (dir, as) {
  if ( as[as.length - 1] == '/') as = as.substring(0, as.length - 1);
  return function (req, res, next) {
    var ind = req.url.indexOf(as)
        , options = !ind
                    ? {
                        root: dir
                      , path: req.url.substring(as.length)
                    }
                    : false
        ;
    if (!options) return next();
    connectStatic.send(req, res, next, options);
  };
};

function updateUrl(req, res, next) {
    var tryDirectory = true
      , filePath = path.join( srcDir, req.url );
    if ( req.url[ req.url.length - 1 ] == '/') {
        req.url = req.url + 'index';
    } else {
        req.url = req.url.replace( /.html$/, function () {
            tryDirectory = false;
            return '';
        });
        if ( !path.exists( filePath + '.md')
                && tryDirectory
                && path.exists( filePath ) && fs.statSync( filePath ).isDirectory()) {
            req.redirect( req.url + '/');
        }
    }
    next();
}

if (process.argv[2] in {'-d':1, '--dev':1}) {
  connect(
      quip()
    , staticMiddleware(config.dir.staticFrom, config.dir.staticTo)
    , updateUrl
    , connect.router(router)
  ).listen(3456);
  console.log('development server started on 127.0.0.1:3456');
}

utils.fsfind(config.dir.source, /.md$/, function (err, file) {
  if (err) throw err;
  var outputFile = path.join(config.dir.output, 
          file.substring(config.dir.source.length, file.length - 3) + '.html')
    , outputFileDir = path.dirname(outputFile)
    , _dirs = []
    , _mds = []
    , _files = []
    ;
  if (!path.existsSync(outputFileDir + '/tmd-listing.html')) {
    fs.readdir(outputFileDir, function (err, files) {
      var html, childhtmlname;
      if (err) return console.log('error generating '+outputFileDir+'/tmd-listing.html');
      files.forEach(function (child) {
        if (fs.statSync(outputFileDir+'/'+child).isDirectory()) {
          _dirs.push({href:child, title:child});
        }
        else if (fs.statSync(outputFileDir+'/'+child).isFile() && child.match(/.md$/)) {
          childhtmlname = child.substring(0, child.lastIndexOf('.'))+'.html';
          _mds.push({href:childhtmlname, title:childhtmlname});
        }
        else if (fs.statSync(outputFileDir+'/'+child).isFile()) {
          _files.push({href:child, title:child});
        }
      });
      html = tp.listing({docs:_mds, dirs:_dirs, files: _files});
      fs.writeFile(path.dirname(outputFile)+'/tmd-listing.html', html, function (err) {
        if (err) console.log(err);
      });
      if (!path.existsSync(path.dirname(file) + '/index.md')) {
        fs.writeFile(path.dirname(outputFile)+'/index.html', html, function (err) {
          if (err) console.log(err);
        });
      }
    });
  }
  utils.mkdir_p(outputFileDir);
  renderJade('document', file, function (err, html) {
    fs.writeFile(outputFile, html, function (err) {
      if (err) console.log(err);
    });
  });
});
