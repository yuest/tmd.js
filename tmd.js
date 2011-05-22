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
  , config
  ;

(function () {
    var configDirPath = path.resolve('.')
      , configDirLastTry
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
}());
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

function renderJade(tpind, mdfilepath, cb) {
    fs.readFile(mdfilepath, 'utf8', function (err, mdstr) {
        if (err) return cb('not found');
        var html = markdown.makeHtml(mdstr)
          , title = html.match(/<h1>(.*)<\/h1>/);
          ;
        title = title ? title[1] : path.basename( mdfilepath);
        cb(null, tp[tpind]({ title: title, content: html}));
    });
}

var router = function (app) {
    app.get('/*', function (req, res, next) {
        var mdfilepath = path.join(srcDir, req.params[0] + '.md');
        renderJade('document', mdfilepath, function (err, html) {
            if (err) return next();
            res.ok().html(html);
        });
    });
    app.get('/*', function (req, res, next) {
        var filepath = req.params[0];
        if (! /index$/.test(filepath )) return next();
        connectStatic.send(req, res, next, {
            root: outDir
            , path: '/' + filepath + '.html'
        });
    });
};

//dir - leading with '/' and not tailing with '/', for example '/static'
//as - what directory you want your file to be served as, for example if it was set to '/public', request of '/public/file' will get './static/file' as a result. set to '', request of '/file' will get './static/file'
var staticMiddleware = function (dir, as) {
    if (as[as.length - 1] == '/') as = as.substring(0, as.length - 1);
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
      , filePath = path.join(srcDir, req.url );
    if (req.url[ req.url.length - 1 ] == '/') {
        req.url = req.url + 'index';
    } else {
        req.url = req.url.replace(/.html$/, function () {
            tryDirectory = false;
            return '';
        });
        if (!path.exists(filePath + '.md')
                && tryDirectory
                && path.exists(filePath ) && fs.statSync(filePath ).isDirectory()) {
            req.redirect(req.url + '/');
        }
    }
    next();
}

function renderFilesInDir(dir) {
    if (!dir) dir = srcDir;
    fs.readdir(dir, function (err, files) {
        if (err) throw 'error on reading source directory.';
        var _dirs = []
          , _mds = []
          , _files = []
          ;
        files.forEach(function (file) {
            if (fs.statSync(path.join(dir, file)).isDirectory()) {
                _dirs.push(file);
                renderFilesInDir(path.join(dir, file));
            } else if ( fs.statSync(path.join(dir, file)).isFile()
                       && /.md$/.test(file)) {
                _mds.push(file);
                renderFile(path.join(dir, file));
            } else if (fs.statSync(path.join(dir, file)).isFile()) {
                _files.push(file);
            }
        });
        renderDir(dir, {
            dirs: _dirs
          , docs: _mds
          , files: _files
        });
    });
}
function renderFile(srcFilePath) {
    var outFilePath = srcFilePath.replace(srcDir, outDir).replace(/.md$/, '.html');
    utils.mkdir_p( path.dirname( outFilePath));
    renderJade('document', srcFilePath, function (err, html) {
        fs.writeFile( outFilePath, html, function (err) {
            if (err) console.log(err);
        });
    });
}
function renderDir(srcDirPath, locals) {
    var outDirPath = srcDirPath.replace(srcDir, outDir);
    utils.mkdir_p( outDirPath);
    var html = tp.listing( locals);
    fs.writeFile( outDirPath + '/tmd-listing.html', html, function (err) {
        if (err) console.log(err);
    });
    if (!path.existsSync( srcDirPath + '/index.md')) {
        fs.writeFile( outDirPath +'/index.html', html, function (err) {
            if (err) console.log(err);
        });
    }
}

if (process.argv[2] in {'-d':1, '--dev':1}) {
    connect(
        quip()
      , staticMiddleware(config.dir.staticFrom, config.dir.staticTo)
      , updateUrl
      , connect.router(router)
    ).listen(3456);
    console.log('development server started on 127.0.0.1:3456');
} else {
    renderFilesInDir(srcDir);
}
