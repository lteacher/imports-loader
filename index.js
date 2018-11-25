/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require('path');
var loaderUtils = require("loader-utils");
var SourceNode = require("source-map").SourceNode;
var SourceMapConsumer = require("source-map").SourceMapConsumer;

var getHeader = function(isCoffee) {
	var headerText = "IMPORTS FROM imports-loader";

	return isCoffee ? '""" ' + headerText + ' """\n' : "/*** " + headerText + " ***/\n";
}

module.exports = function(content, sourceMap) {
	var isCoffee = this.resourcePath && path.extname(this.resourcePath) === '.coffee';
	if(this.cacheable) this.cacheable();
	var query = loaderUtils.getOptions(this) || {};
	var imports = [];
	var postfixes = [];
	Object.keys(query).forEach(function(name) {
		var value;
		if(typeof query[name] == "string" && query[name].substr(0, 1) == ">") {
			value = query[name].substr(1);
		} else {
			var mod = name;
			if(typeof query[name] === "string") {
				mod = query[name];
			}
			value = "require(" + JSON.stringify(mod) + ")";
		}
		if(name === "this") {
			if (isCoffee) throw new Error('This bind not supported for coffeescript');
			imports.push("(function() {");
			postfixes.unshift("}.call(" + value + "))");
		} else if(name.indexOf(".") !== -1) {
			name.split(".").reduce(function(previous, current, index, names) {
				var expr = previous + current;

				if(previous.length === 0) {
					imports.push((isCoffee ? "" : "var ") + expr + " = (" + current + " || {})");
				} else if(index < names.length-1) {
					imports.push(expr + " = " + expr + " || {}");
				} else {
					imports.push(expr + " = " + value);
				}

				return previous + current + ".";
			}, "");
		} else {
			imports.push((isCoffee ? "" : "var ") + name + " = " + value);
		}
	});
	var prefix = getHeader(isCoffee) + imports.join("\n") + "\n\n";
	var postfix = "\n" + postfixes.join("\n");
	if(sourceMap) {
		var currentRequest = loaderUtils.getCurrentRequest(this);
		var node = SourceNode.fromStringWithSourceMap(content, new SourceMapConsumer(sourceMap));
		node.prepend(prefix);
		node.add(postfix);
		var result = node.toStringWithSourceMap({
			file: currentRequest
		});
		this.callback(null, result.code, result.map.toJSON());
		return;
	}
	return prefix + content + postfix;
}
