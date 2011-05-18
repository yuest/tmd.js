module.exports = {
    dir: {//dirs ending with '/', __dirname is the full path of config.js and '.' is the relative path to `pwd` of command line.
        source: __dirname + "/tmd.js/tmd-source/"
      , template: __dirname + "/tmd.js/tmd-templates/"
      , output: __dirname + "/aaa"
    }
  , locals: {//default variables in templates
    }
};
