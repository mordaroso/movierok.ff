// *******************************************************************************
// * movierok.ff
// *
// * File: chrome.js
// * Description: init, events, and Chrome Class
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

var change_intervall = null;
var events = new Array();
var mrLogger;
var idleObserver;
var idleTime;
var stringsBundle;
window.addEventListener("load", init, true);

function init() {
	stringsBundle = document.getElementById("string-bundle");
	mrLogger = new MRLogger(getPreference("logLevel", "String"), getPreference(
			"logToFile", "boolean"));
	if (getPreference("enabled", "boolean") == false) {
		MovierokChrome.setStatus("disabled");
	}
	initMovierokEvents();
	if (getPreference("player", "String") == "") {
		setPreference("player", Player.getDefalutPlayer(), "String");
		mrLogger.debug("new player is set");
	}
	checkVersion();
}

function initMovierokEvents() {
	var idleService = Components.classes["@mozilla.org/widget/idleservice;1"]
			.getService(Components.interfaces.nsIIdleService)
	window.removeEventListener("DOMContentLoaded", pageShow, true);
	if (idleObserver != null) {
		idleService.removeIdleObserver(idleObserver, idleTime);
		idleObserver = null
	}
	if (getPreference("enabled", "boolean") == true) {
		window.addEventListener("DOMContentLoaded", pageShow, true);
		mrLogger.debug("loaded content event");
		if (getPreference("autoUpdate", "boolean") == true) {
			idleTime = getPreference("idleTime", "int") * 60;
			idleObserver = {
				observe : function(subject, topic, data) {
					if (topic == "idle") {
						MovierokChrome.update();
					}
				}
			};
			idleService.addIdleObserver(idleObserver, idleTime);
		}
	}
}

function checkVersion() {
	var ver = "-1", firstrun = true;
	var current = getVersion();
	try {
		ver = getPreference("version", "String");
		firstrun = getPreference("firstrun", "boolean");
	} catch (e) {
	} finally {
		if (firstrun) {
			setPreference("firstrun", false, "boolean");
			setPreference("version", current, "String");
			mrLogger.info("movierok extension successfully installed");
			MovierokChrome.showSettings();
		}
		if (ver != current && !firstrun) {
			setPreference("version", current, "String");
			mrLogger.info("movierok extension successfully updated");
		}
	}
}

function pageShow(event) {
	try {
		var doc = event.target;
		var remote = getPreference("remoteHost", "String");
		if (doc.location.host == remote) {
			mrLogger.debug("remote page visited");
			changePlayLinks(doc);
			changeChecksums(doc);
			var rips = doc.getElementById("rips");
			if (rips)
				events.push(rips.addEventListener("DOMNodeInserted",
						changeByEvent, true));
			var captions = doc.getElementById("captions");
			if (captions)
				events.push(captions.addEventListener("DOMNodeInserted",
						changeByEvent, true));

			if (doc.getElementById("unknown_parts"))
				init_omdb_suggest()
		}
	} catch (exc) {
	}
}
function changeByEvent(event) {
	if (change_intervall != null) {
		window.clearInterval(change_intervall);
		change_intervall = null;
	}
	change_intervall = window.setInterval("changePlayLinks()", 50);
}
function changePlayLinks(doc) {
	if (doc == null) {
		doc = window.content.document;
	}
	if (change_intervall) {
		window.clearInterval(change_intervall);
		change_intervall = null;
	}
	var elements = getElementsByClassName(doc, '*', 'play_link');
	var i = 0;
	for (; i < elements.length; i++) {
		appendPlayButton(elements[i]);
	}
	mrLogger.debug(i + " play buttons added");
}

function changeChecksums(doc) {
	var elements = getElementsByClassName(doc, '*', 'check_sum');
	var i = 0;
	for (; i < elements.length; i++) {
		appendFileName(elements[i]);
	}
	changePlayLinks(doc);
	mrLogger.debug(i + " checksums changed to path");
}

function appendFileName(element) {
	var checksum = element.innerHTML;
	var filter = /^[a-zA-Z0-9]*$/;
	if (filter.test(checksum)) {

		var part = PartController.findByChecksum(checksum);
		if (part != null) {
			element.className = "filename";
			element.innerHTML = part.getShortPath()
					+ "<div class =\"play_link\">" + checksum + "</div>";
		}
	}
}

function appendPlayButton(element) {
	var checksums = element.innerHTML;
	var filter = /^[a-zA-Z0-9\+]*$/;
	if (filter.test(checksums)) {
		var sums = checksums.split('+');

		for (var i = 0; i < sums.length; i++) {
			if (PartController.findByChecksum(sums[i]) != null) {
				element.innerHTML = "<a href='#' alt='" + checksums
						+ "' title='play' >&nbsp;</a>";
				element.style.display = 'inline';
				element.addEventListener("click", play, true);
				break;
			}
		}
	}
}

var last_played
function play(event) {

	// prevents the player to start twice on a double click
	if (last_played && (new Date().getTime() - last_played < 500))
		return false
	last_played = new Date().getTime()

	var checksums = event.currentTarget.lastChild.getAttribute("alt");
	var sums = checksums.split('+');
	var arguments = new Array();
	for (var i = 0; i < sums.length; i++) {
		var part = PartController.findByChecksum(sums[i]);
		if (part != null) {
			arguments.push(part.path);
		}
	}
	var player = getPreference("player", "String");

	launchProgram(player, arguments);
	mrLogger.debug(arguments + " played");

}

var MovierokChrome = {
	style : "normal",
	setPercent : function(percent) {
		if (percent == 0) {
			document.getElementById("mrProgress").setAttribute("mode",
					"undetermined");
		} else {
			document.getElementById("mrProgress").setAttribute("mode",
					"determined");
			document.getElementById("mrProgress")
					.setAttribute("value", percent);
		}
	},
	setError : function(error) {
		document.getElementById("mrError").value = error;
	},
	setStatus : function(state) {
		switch (state) {
			case ("disabled") : {
				this.style = "disabled";
				setPreference("enabled", false, "boolean");
				document.getElementById("mrDisabled").setAttribute("checked",
						"true");
				break;
			}
			case ("parsing") : {
				this.style = "add";
				document.getElementById("mrProgress").setAttribute("style",
						"display:block");
				break;
			}
			case ("endparsing") : {
				if (this.style != "error")
					if (getPreference("enabled", "boolean") == false)
						this.style = "disabled";
					else
						this.style = "normal";
				document.getElementById("mrProgress").setAttribute("style",
						"display:none");
				break;
			}
			case ("error") : {
				this.style = "error";
				document.getElementById("mrError").setAttribute("style",
						"display:block");
				break;
			}
			default : {
				this.style = "normal";
				document.getElementById("mrDisabled").setAttribute("checked",
						"false");
				setPreference("enabled", true, "boolean");
				break;
			}
		}
		if (this.style != "error")
			document.getElementById("mrError").setAttribute("style",
					"display:none");
		mrLogger.debug("changed status to " + state);
		document.getElementById("mrStatusLogo").setAttribute("class",
				"logo16 " + this.style);
	},
	click : function(e) {
		if (e.button == 0) {
			this.gotoWebsite()
		}
	},
	gotoWebsite : function() {
        var path = "/home/mordaroso/Desktop/ed_hd.avi";
        var file = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(path);
        var movieData = MovieFile.testFile(file);
        for(var i in movieData){
        	mrLogger.debug(movieData[i]);
        }
	},
	openUrlToNewTab : function(url) {
		try {
			var windowManager = (Components.classes["@mozilla.org/appshell/window-mediator;1"])
					.getService();
			var windowManagerInterface = windowManager
					.QueryInterface(Components.interfaces.nsIWindowMediator);
			var browser = (windowManagerInterface
					.getMostRecentWindow("navigator:browser")).getBrowser();
			var newTab = browser.addTab(url);
			browser.selectedTab = newTab;
		} catch (e) {
			alert('error')
		}
	},
	showSettings : function() {
		window.open("chrome://movierok/content/settings.xul", "mr_settings",
				"chrome");
	},
	update : function() {
		this.doParse(false, false);
	},
	rescan : function() {
		this.doParse(true, true);
	},
	doParse : function(sync, incomplete) {
		if (parser.status == 'ready') {
			parser.sync = sync;
			parser.incomplete = incomplete;
			parser.start();
		}
	},
	changeDisable : function(event) {
		if (document.getElementById("mrDisabled").hasAttribute("checked")) {
			this.setStatus("disabled");
		} else {
			this.setStatus("normal");
		}
		initMovierokEvents();
	}
}
