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
    // get moviedirs
		var list = document.getElementById("moviedirList");

		moviedirs = MovieDirController.getAllMovieDirs();
		for (var i = 0; i < moviedirs.length; i++) {
			list.appendItem(moviedirs[i].path, i);
		}

    // get player
		var movieplayer = document.getElementById("movieplayer");
		var player = getPreference("player", "String");
		movieplayer.value = player;

    // get autoUpdate
    var enableUpdates = document.getElementById("enableUpdate");
    var isUpdating = getPreference("autoUpdate", "boolean");
    enableUpdates.checked = isUpdating;
    refreshUpdate();

    // get idleTime
    var idleTime = document.getElementById("idleTime");
    var time = getPreference("idleTime", "int");
    idleTime.value = time;
	} catch (exc) {
		window.opener.mrLogger.error(exc);
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

		// player
    var movieplayer = document.getElementById("movieplayer");
		setPreference("player", movieplayer.value, "String");

    // autoupdate
    var enableUpdates = document.getElementById("enableUpdate");
    setPreference("autoUpdate",enableUpdates.checked, "boolean");

    // idletime
    var idleTime = document.getElementById("idleTime");
    setPreference("idleTime",idleTime.value, "int");

		if(changed){
			window.opener.MovierokChrome.rescan();
		}
	} catch (exc) {
		alert('Something went wrong...');
    window.opener.mrLogger.error(exc);
	}
}
function addMovieDir() {
	const nsIFilePicker = Components.interfaces.nsIFilePicker;
	var fp = Components.classes["@mozilla.org/filepicker;1"]
			.createInstance(Components.interfaces.nsIFilePicker);
	fp.init(window, "select your movie folder", nsIFilePicker.modeGetFolder);
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

function refreshUpdate(){
    var enableUpdates = document.getElementById("enableUpdate");
    document.getElementById("lblUpdateBefore").disabled = !enableUpdates.checked;
    document.getElementById("idleTime").disabled = !enableUpdates.checked;
    document.getElementById("lblUpdateAfter").disabled = !enableUpdates.checked;
}

function selectPlayer() {
  var nsIFilePicker = Components.interfaces.nsIFilePicker;
  var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

  fp.init(window, "Select Player", nsIFilePicker.modeOpen);
  var osString = Components.classes["@mozilla.org/xre/app-info;1"]
				.getService(Components.interfaces.nsIXULRuntime).OS;

  if (osString == "WINNT") { // Windows
    // set directory
    var program_folder = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProgF", Components.interfaces.nsIFile);
    fb.displayDirectory = program_folder
  }
  fp.appendFilters(nsIFilePicker.filterApps | nsIFilePicker.filterAll); // Apps or all
  var res = fp.show();

  if (res == nsIFilePicker.returnOK) {
    var thefile = fp.file;
    document.getElementById("movieplayer").value = thefile.path;
  }
}
