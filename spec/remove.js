/*jslint node: true*/
// Adapted from:
// http://www.geedew.com/remove-a-directory-that-is-not-empty-in-nodejs/
// because I'm horrible with fs
'use strict';
var delimiter, sep, fs = require('fs');
delimiter = require('path').sep;
sep = new RegExp(delimiter + '*$');

function remove(path) {
	if (!path) {
		return;
	}
	if (fs.existsSync(path)) {
		fs.readdirSync(path).forEach(function (file, index) {
			var curPath = path.replace(sep, delimiter) + file;
			if (fs.lstatSync(curPath).isDirectory()) {
				remove(curPath);
			} else {
				fs.unlinkSync(curPath);
			}
		});
		if (fs.existsSync(path)) {
			fs.rmdirSync(path);
		}
	}
	return null;
}
module.exports = remove;