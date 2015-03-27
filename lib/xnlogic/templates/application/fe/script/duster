#!/usr/bin/env node

// var duster = require('../lib/duster.js');

var fs = require('node-fs')
var path = require('path')
var watch = require('watch')
var colors = require('colors')
var duster = require('../lib/duster')

var opts = require('optimist')
	.usage('Watches a directory tree and compiles templates when changed.\n' +
	       colors.bold('Usage:') + ' $0 [options] input [input...] output\n' +
		   '\n' +
		   'Multiple ' + colors.bold('input') + 's may be specified, and each input may be either a directory or a file.\n' +
		   'If --concat is specified, then ' + colors.bold('output') + ' will be treated as a file, otherwise it will be treated as a directory.')
	.alias('verbose', 'v').boolean('verbose').describe('verbose', 'verbose mode')
	.alias('watch', 'w').boolean('watch').describe('watch', 'watch input directory(s) for changes')
	.alias('concat', 'c').boolean('concat').default('concat', true).describe('concat', 'concatenate all compiled templates into one javascript file (turn off with --no-concat)')
	.alias('minify', 'm').boolean('minify').default('minify', true).describe('minify', 'minify all the compiled templates (turn off with --no-minify)')
	.alias('interval', 'i').default('interval', 100).describe('interval', 'set the polling interval (in milliseconds)')
    .alias('include-js', 'j').boolean('include-js').default('include-js', true).describe('include-js', 'include .js files in the output in addition to .dust files')
	.describe('help', 'show usage information and exit')
	.describe('version', 'show program version and exit')
	.check(function(argv) {
			if (argv.interval <= 0)
				throw "The polling interval must be greater than zero";
			if (argv._.length == 0)
				throw "No input or output files/directories specified";
			if (argv._.length == 1)
				throw "Both an input and output must be specified (inputs first, then outputs)"
	})

var argv = opts.argv;

if (argv.version) {
	console.error("duster v" + require('../package.json').version)
	console.error("node " + process.version)
	return
}

if (argv.help || argv._.length < 2)
	return opts.showHelp();

	var outputPath = argv._[argv._.length - 1];
	var inputPaths = argv._.slice(0, argv._.length - 1);

	inputPaths = inputPaths.map(function (p) {
		if (!fs.existsSync(p))
			throw "Input directory does not exist: " + p;
		return path.normalize(p);
	})

	var stat = null;
	try {
		stat = fs.lstatSync(outputPath);
	} catch (e) {}

	if (stat == null) {
		// Try to create the output file/directory
		if (argv.concat) {
			fs.mkdirSync(path.dirname(outputPath), null, true);
			fs.writeFileSync(outputPath, '');
		} else {
			fs.mkdirSync(outputPath, null, true);
		}
	}

	if (argv.concat && stat && stat.isDirectory())
		throw "Output file is a directory (--concat is specified, so the output should be name of a file)";
	else if (!argv.concat && stat && stat.isFile())
		throw "Output directory is a file (--concat is not specified, so the output should be the name of a directory)";

	if (argv.verbose) {
		inputPaths.forEach(function(p) {
			console.log("Input:", p)
		})
		console.log("Output:", outputPath)
	}

	duster.compileAll(inputPaths, outputPath, argv);

if (argv.watch) {
	duster.watch(inputPaths, outputPath, argv, function (err, results) {
		if (err) {
			console.error(colors.red(colors.bold("Error:")), err);
		} else {
			var info = "";
			if (argv.minify) {
				var pct = 100;
				if (results.bytesRead > 0)
					pct = Math.round(results.bytesWritten * 100.0 / results.bytesRead);
				info = " " + Math.round(results.bytesWritten/10.24)/100 + '/' + Math.round(results.bytesRead/10.24)/100 + 'KB (' + pct + '%)'
			}
			console.error(
				colors.yellow(colors.bold("Changes compiled")),
				"(" + new Date().toLocaleTimeString() + ")" + info)
		}
	});
	process.on("SIGBREAK", function() {
		duster.compileAll(inputPaths, outputPath, argv);
	});
}

