var fs = require('node-fs'),
    path = require('path'),
    dust = require('dustjs-linkedin'),
    watch = require('watch'),
    uglify = require('uglify-js'),
    diveSync = require('diveSync'),
    colors = require('colors');

var compileFileSync = exports.compileFileSync = function (filePath, templateId) {
    // tweak: full relative path names of templates
    if (!templateId)
      if (path.dirname(filePath) == 'assets/templates')
        templateId = path.basename(filePath, '.dust');
      else
        templateId = path.dirname(filePath).replace('assets/templates/', "") + '/' + path.basename(filePath, '.dust');

    var template = fs.readFileSync(filePath);
    return dust.compile(String(template), templateId);
};

var minify = exports.minify = function (js) {
    return uglify.minify(js, { fromString: true }).code;

    // var ast = uglify.parse(js);
    // ast.figure_out_scope();
    // return ast.transform(uglify.Compressor({ warnings: false })).print_to_string();
};

// converts js into a module
var browserify = exports.browserify = function (js, req, exp) {
    req = req ? "var dust=require('dustjs-linkedin');" : '';
    exp = exp ? "module.exports=dust;" : '';
    return  req + js + exp;
};

var compileAll = exports.compileAll = function (inputPaths, outputPath, options) {
    options = options || {};

    var first = true;

    var bytesRead = 0;
    var bytesWritten = 0;
    var js, out, dir;


        if (options.concat)
            fs.unlinkSync(outputPath);

        inputPaths.forEach(function (p) {
            function processFile(err, file) {
                    if (err)
                        throw err;

                    if (file.match(/\.js$/i) && options["include-js"]) {
                        if (options.concat) {
                            fs.appendFileSync(outputPath, '\n');
                            js = fs.readFileSync(file);
                            if (options.minify)
                                js = minify(js.toString());
                            fs.appendFileSync(outputPath, js);
                        } else {
                            file = path.relative(p, file);
                            out = path.join(outputPath, file);
                            dir = path.dirname(out);

                            if (options.verbose)
                                console.log("Writing", out);

                            fs.mkdirSync(dir, null, true);
                            fs.writeFileSync(out, js);
                        }
                        return;
                    } else if (!file.match(/\.dust$/i)) {
                        return;
                    }

                    js = compileFileSync(file);
                    bytesRead += js.length;

                    if (options.minify)
                        js = minify(js);

                    if (options.concat) {
                        // Add a newline between files if not minifying (in case '//' comments mess things up,
                        // or brackety syntactical stuff)
                        if (!first)
                            js = "\n;" + js;

                        bytesWritten += js.length;

                        if (first) {
                            if (options.browserify)
                                js = browserify(js, true);
                            fs.writeFileSync(outputPath, js);
                        }
                        else
                            fs.appendFileSync(outputPath, js);

                        first = false;
                    } else {
                        file = path.relative(p, file);
                        out = path.join(outputPath, file);
                        dir = path.dirname(out);
                        out = out.replace(/\.dust$/, '.js');

                        if (options.verbose)
                            console.log("Writing", out);

                        fs.mkdirSync(dir, null, true);
                        if (options.browserify)
                            fs.writeFileSync(out, browserify(js, true, true));
                        else
                            fs.writeFileSync(out, js);
                    }
            }

            var stats = fs.statSync(p);
            if (stats.isFile()) {
              processFile(null, p);
            } else {
              if (fs.existsSync(path.join(p, ".order"))) {
                  try {
                      var order = fs.readFileSync(path.join(p, ".order"));
                      order = order.toString("utf8").split(/\n+/);
                      order.forEach(function(file) {
                          file = file.trim();
                          if (file === '')
                              return;
                          processFile(null, path.join(p, file));
                      });
                  } catch (e) {
                      diveSync(p, processFile);
                  }
              } else {
                  diveSync(p, processFile);
              }
            }
        });

    if (options.browserify && options.concat)
        fs.appendFileSync(outputPath, browserify('', false, true));

    return {
        bytesRead: bytesRead,
        bytesWritten: bytesWritten
    };
};

var doWatch = exports.watch = function (inputPaths, outputPath, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    } else if (!options) {
        options = {};
    }

    function recompile(event) {
        return function (f, stat) {
            if (!stat)
                return; // Apparently this means it's finished walking the tree.

            if (!stat.isFile() || f.match(/\.dust$/i) || (options["include-js"] && f.match(/\.js$/i))) {
                if (options.verbose)
                    console.log("File " + event + ":", f);

                try {
                    var results = compileAll(inputPaths, outputPath, options);
                    if (callback)
                        callback(null, results);
                } catch (e) {
                    if (callback)
                        [].concat(e).forEach(callback);
                }
            }
        };
    }

    inputPaths.forEach(function(p) {
        watch.createMonitor(p, {
            persistent: true,
            interval: options.interval || 100
        }, function(monitor) {
            if (options.verbose)
                console.error("Watching", p);

            monitor.on("created", recompile("created"));
            monitor.on("changed", recompile("changed"));
            monitor.on("removed", recompile("removed"));
        });
    });
};
