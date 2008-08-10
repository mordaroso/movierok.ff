// *******************************************************************************
// * movierok.ff
// *
// * File: settings.js
// * Description: javascript vars and methods for the settings dialog
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

var addMovieDirs = [];
var removeMovieDirs = [];
var moviedirs;
function init() {
	try {
		var list = document.getElementById("moviedirList");

		moviedirs = MovieDirController.getAllMovieDirs();
		for (var i = 0; i < moviedirs.length; i++) {
			list.appendItem(moviedirs[i].path, i);
		}

		var movieplayer = document.getElementById("movieplayer");
		var player = getPreference("player", "String");
		movieplayer.value = player;
	} catch (exc) {
		alert(exc);
	}
}
function applyChanges() {
	try {
		var changed;
		for (var i = 0; i < addMovieDirs.length; i++) {
			var moviedir = addMovieDirs[i];
			moviedir.save();
			changed = true;
		}
		for (var i = 0; i < removeMovieDirs.length; i++) {
			var moviedir = removeMovieDirs[i];
			moviedir.remove();
			changed = true;
		}
		var movieplayer = document.getElementById("movieplayer");
		setPreference("player", movieplayer.value, "String");
		if(changed){
			window.opener.MovierokChrome.rescan();
		}
	} catch (exc) {
		alert(exc);
	}
}
function addMovieDir() {
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"]
			.createInstance(Components.interfaces.nsIFilePicker);
	fp.init(window, "Choose MovieDir", nsIFilePicker.modeGetFolder);
	fp.appendFilters(nsIFilePicker.filterAll);

	var rv = fp.show();
	if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace) {
		var list = document.getElementById("moviedirList");
		var moviedir = new MovieDir();
		moviedir.path = fp.file.path;
		list.appendItem(moviedir.path, -1);
		addMovieDirs.push(moviedir);
	}
}
function removeMovieDir() {
	var list = document.getElementById("moviedirList");
	var value = list.getItemAtIndex(list.selectedIndex).value;
	if (value != -1)
		removeMovieDirs.push(moviedirs[value]);
	list.removeItemAt(list.selectedIndex);

}
