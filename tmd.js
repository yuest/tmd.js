require.paths.unshift('./node_modules/markdown/lib');
var fs = require('fs')
  , markdown = require('markdown')
  , connect = require('connect')
  , connectStatic = connect['static']
  , quip = require('quip')
  , jade = require('jade')
  , tp = {}
  ;

var router = function (app) {
  app.get('/', function (req, res, next) {
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
    filepath = __dirname + '/' + filepath;
    fs.readFile(filepath, 'utf8', function (err, mdstr) {
      if (err) return res.notFound().html('not found');
      res.ok().html(tp.article({content: markdown.makeHtml(mdstr)}));
    });
  });
};

['document'].forEach(function (name, ind, list) {
  fs.readFile(__dirname + '/tmd-templates/'+name+'.jade', 'utf8', function(err, str){
    if (err) throw Error('tmd-templates/'+name+'.jade could not be found');
    try {
      tp.article = jade.compile(str);
    } catch (err) {
      throw Error('error on compile tmd-templates/'+name+'.jade');
    }
  });
});

connect(
    quip()
  , function (req, res, next) {
      var ind = req.url.indexOf('/tmd-static')
        , options = !ind ? {
              root: __dirname + '/tmd-static'
            , path: req.url.substring(11)
          } : null
        ;
      if (!options) return next();
      connectStatic.send(req, res, next, options);
    }
  , connect.router(router)
).listen(3456);
