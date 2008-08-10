// *******************************************************************************
// * movierok.ff
// *
// * File: dirparser.js
// * Description: dirparser thread
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

var DirParser = function() {
	this.steps = null;
	this.stepVars = null;
	this.running = false;
	this.stepInterval = null;
	this.changedDirs = null;
	this.newParts = null;
	this.oldParts = null;
	this.orgParts = null;
	this.status = 'ready';
	this.sync = false;
	this.moviedirs = null;
	this.incomplete = false;
	this.incompleteParts;
	this.totalSteps;
	this.finishedSteps;
}
DirParser.prototype = {
	stop : function() {
		MovierokChrome.setStatus("endparsing");
		if (this.stepInterval) {
			window.clearInterval(this.stepInterval);
			this.stepInterval = null;
		}
		this.running = false;
		this.status = 'ready';
		mrLogger.debug("dirparser finished");
	},
	start : function() {
		MovierokChrome.setStatus("parsing");
		MovierokChrome.setPercent(0);
		this.steps = new Array();
		this.stepVars = new Array();
		this.totalSteps = 0;
		this.finishedSteps = 0;
		this.addStep("this.checkVersion()", null);
		this.addStep("this.init()", null);

		if (this.sync) {
			this.addStep("this.getPartsOnRemote()", null);
		}
		this.addStep("this.checkMovieDirs()", null);
		this.addStep("this.removeShadows()", null);
		this.addStep("this.sendPartsToRemote()", null);
		if (this.incomplete) {
			this.incompleteParts = new Array();
			this.addStep("this.getIncomplete()", null);
			this.addStep("this.sendIncomplete()", null);
		}
		this.stepInterval = window.setInterval("parser.doNextStep()", 10);
	},
	addStep : function(step, vars) {
		this.steps.push(step);
		this.stepVars.push(vars);
		this.totalSteps++;
	},
	setNextStep : function(step, vars) {
		this.stepVars.unshift(vars);
		this.steps.unshift(step);
		this.totalSteps++;
	},
	doNextStep : function() {
		if (this.running)
			return
		if (this.steps.length > 0) {
			try {
				this.running = true;
				var step = this.steps[0];
				this.tmp = this.stepVars[0];
				// mrLogger.debug("execute: " + step);
				this.steps.shift();
				this.stepVars.shift();

				eval(step);

				this.running = false;
				this.finishedSteps++;
				MovierokChrome.setPercent(Math.floor(100 / this.totalSteps
						* this.finishedSteps));
			} catch (exc) {
				mrLogger.error(exc);
				this.stop();
			}
		} else {
			this.stop();
		}
	},
	checkVersion : function() {
		var remote = getPreference("remoteHost", "String");
		var url = "http://" + remote
				+ '/firefox_extension/compatible_versions.js';
		var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance(Components.interfaces.nsIDOMEventTarget);
		request.QueryInterface(Components.interfaces.nsIXMLHttpRequest);
		request.addEventListener("load", function(evt) {
			parser.handleVersion(evt);
		}, false);
		request.addEventListener("error", function(evt) {
			parser.error(evt);
		}, false);
		request.open("GET", url, false);
		request.send(null);
	},
	handleVersion : function(event) {
		var response = event.currentTarget.responseText;
		mrLogger.debug("Compatible versions on remote: " + response);
		var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
				.createInstance(Components.interfaces.nsIJSON);
		var versions = nativeJSON.decode(response);
		var isCompatible = false;
		for (var i in versions) {
			mrLogger.debug("Version: " + versions[i])
			if (versions[i] == getVersion()) {
				isCompatible = true;
			}
		}
		if (!isCompatible) {
			this.status = 'error';
			MovierokChrome.setStatus("error");
			MovierokChrome.setError(stringsBundle.getString("versionString"));
			this.stop();
		}
	},
	init : function() {
		this.changedDirs = new Array();
		this.newParts = new Hash();
		this.oldParts = new Hash();
		this.orgParts = new Hash();
		this.status = 'running';
		this.moviedirs = MovieDirController.getAllMovieDirs();
	},
	getPartsOnRemote : function() {
		var remote = getPreference("remoteHost", "String");
		var url = "http://" + remote + '/parts.json';
		var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance(Components.interfaces.nsIDOMEventTarget);
		request.QueryInterface(Components.interfaces.nsIXMLHttpRequest);
		request.addEventListener("load", function(evt) {
			parser.handlePartsOnRemote(evt);
		}, false);
		request.addEventListener("error", function(evt) {
			parser.error(evt);
		}, false);
		request.open("GET", url, false);
		request.send(null);
	},
	handlePartsOnRemote : function(event) {
		var response = event.currentTarget.responseText;
		if (isJSON(response)) {
			mrLogger.debug("parts on remote: " + response);
			var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
					.createInstance(Components.interfaces.nsIJSON);

			var parts = nativeJSON.decode(response);

			for (var i = 0; i < parts.length; i++) {
				//mrLogger.debug("checksum on remote: " + parts[i].check_sum);
				part = new Part();
				part.checksum = parts[i].check_sum;
				this.oldParts.setItem(parts[i].check_sum, part);
				this.orgParts = this.oldParts.clone();
			}
		} else {
			mrLogger.debug("response is not json: " + response);
			this.error(event);
		}
	},
	error : function(event) {
		var error = 'connectionString';
		if (event.currentTarget.status == 401) {
			mrLogger
					.warning("Login to remote failed! Please check if cookies are enabled and login on the remote page.");

			error = 'authString';
		} else {
			mrLogger.warning("AJAX finished with state: "
					+ event.currentTarget.status);
		}
		this.status = 'error';
		MovierokChrome.setStatus("error");
		MovierokChrome.setError(stringsBundle.getString(error));
		this.stop();
	},
	checkMovieDirs : function() {
		for (var i = 0; i < this.moviedirs.length; i++) {
			if (this.moviedirs[i].exists()) {
				var vars = new Array(this.moviedirs[i].getFile(),
						this.moviedirs[i]);
				this.setNextStep("this.checkDir()", vars);
			} else {
				MovierokChrome.setStatus("error");
				var errortext = stringsBundle.getString('moviedirString');
				errortext = errortext.replace(/\$\d/g, this.moviedirs[i].path);
				MovierokChrome.setError(errortext);

			}
		}
	},
	checkDir : function() {
		var folder = this.tmp[0];
		var moviedir = this.tmp[1];
		var dir = DirController.findOrInitializeByPath(folder.path);
		if (dir.id === null) {
			dir.moviedir = moviedir.id;
			dir.save();
		}
		var checkFiles = false;
		if (dir.hasChanged() || this.sync) {
			checkFiles = true;
			var parts = PartController.findByDir(dir.id);
			for (var i = 0; i < parts.length; i++) {
				this.oldParts.setItem(parts[i].checksum, parts[i]);
			}

		}
		var files = dir.getFilesInDir();
		for (var i = 0; i < files.length; i++) {
			try {
				if (files[i].isDirectory()) {
					var vars = new Array(files[i], moviedir);
					this.setNextStep("this.checkDir()", vars);
				} else if (checkFiles) {
					if (PartController.isPart(files[i].path)) {
						var vars = new Array(files[i], dir);
						this.setNextStep("this.checkPart()", vars);
					}
				}
			} catch (exc) {
				mrLogger.debug(exc);
			}
		}
		if (checkFiles) {
			dir.hash = dir.generateHash();
			this.changedDirs.push(dir);
		}
	},
	checkPart : function() {
		var file = this.tmp[0];
		var dir = this.tmp[1];
		var part = null;
		try {
			part = PartController.findOrInitializeByChecksum(file);
		} catch (exc) {
			return;
		}
		if (this.newParts.hasItem(part.checksum)) {
			mrLogger.debug("twice found: " + file.path);
		} else if (part.path == null) {
			part.path = file.path;
			part.dir = dir.id;
			this.newParts.setItem(part.checksum, part);
		} else if (part.path != file.path) {
			part.path = file.path;
			part.dir = dir.id;
			part.save();
			mrLogger.debug("moved : " + file.path);
		}
		if (this.sync && !this.orgParts.hasItem(part.checksum)) {
			this.newParts.setItem(part.checksum, part);
		}
		if (this.oldParts.hasItem(part.checksum))
			this.oldParts.removeItem(part.checksum)
	},
	removeShadows : function() {
		var parts = PartController.findShadowParts();
		DirController.removeShadowDirs();
		for (var i = 0; i < parts.length; i++) {
			this.oldParts.setItem(parts[i].checksum, parts[i]);
		}
	},
	sendPartsToRemote : function() {
		if (this.newParts.length > 0 || this.oldParts.length > 0) {
			this.setNextStep("this.saveAll()", null);
			this.setNextStep("this.sendNewParts()", null);
			this.setNextStep("this.removeOldParts()", null);
		}
	},
	sendNewParts : function() {
		if (this.newParts.length > 0) {
			var sendParts = this.newParts.clone();
			sendParts.removeHash(this.orgParts);
			if (sendParts.length == 0) {
				return null;
			}
			var content = PartController.partsToXML(sendParts.items);
			mrLogger.debug("add:\n" + content);
			var remote = getPreference("remoteHost", "String");
			var url = "http://" + remote + '/parts.xml';
			var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
					.createInstance(Components.interfaces.nsIDOMEventTarget);
			request.QueryInterface(Components.interfaces.nsIXMLHttpRequest);
			request.addEventListener("error", function(evt) {
				parser.error(evt);
			}, false);
			request.open("POST", url, false);
			request.send(content);
		}
	},
	removeOldParts : function() {
		if (this.oldParts.length > 0) {
			var content = PartController.partsToXML(this.oldParts.items);
			mrLogger.debug("remove:\n" + content);
			var remote = getPreference("remoteHost", "String");
			var url = "http://" + remote + '/parts/remove.xml';
			var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
					.createInstance(Components.interfaces.nsIDOMEventTarget);
			request.QueryInterface(Components.interfaces.nsIXMLHttpRequest);
			request.addEventListener("error", function(evt) {
				parser.error(evt);
			}, false);
			request.open("PUT", url, false);
			request.send(content);
		}
	},
	saveAll : function() {
		if (this.status != 'error') {
			mrLogger.debug('save all');

			for (var checksum in this.newParts.items) {
				this.newParts.getItem(checksum).save();
			}
			for (var checksum in this.oldParts.items) {
				if (this.oldParts.getItem(checksum).id != null)
					this.oldParts.getItem(checksum).remove();
			}
			for (var i = 0; i < this.changedDirs.length; i++) {
				this.changedDirs[i].save();
			}
		}
	},
	getIncomplete : function() {
		var remote = getPreference("remoteHost", "String");
		var url = "http://" + remote + '/parts/incomplete.json';
		var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance(Components.interfaces.nsIDOMEventTarget);
		request.QueryInterface(Components.interfaces.nsIXMLHttpRequest);
		request.addEventListener("load", function(evt) {
			parser.handleIncomplete(evt);
		}, false);
		request.addEventListener("error", function(evt) {
			parser.error(evt);
		}, false);
		request.open("GET", url, false);
		request.send(null);
	},
	sendIncomplete : function() {
		if (this.incompleteParts.length > 0) {
			var splitSize = 200;
			mrLogger.debug("count complete: "+this.incompleteParts.length);
			for (var j = 0; j < this.incompleteParts.length; j += splitSize) {
				var xmlText = "";
				xmlText += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
				xmlText += "<parts>";
				for (var count = j; (count < (j  + splitSize)) && (count < this.incompleteParts.length); count++) {
					var check_sum = this.incompleteParts[count][0];
					var mfile = this.incompleteParts[count][1];
					xmlText += "<part>";
					xmlText += "<check-sum>" + check_sum + "</check-sum>";

                    // VIDEO		
                    if (mfile.video_encoding != null)
						xmlText += "<video_encoding>" + mfile.video_encoding
								+ "</video_encoding>";			
                    if (mfile.video_framerate != null)
						xmlText += "<video_frame_rate>" + mfile.video_framerate
								+ "</video_frame_rate>";
                    if (mfile.video_resolution != null)
						xmlText += "<video_resolution>"
								+ mfile.video_resolution
								+ "</video_resolution>";

                    // AUDIO
					if (mfile.audio_encoding != null)
						xmlText += "<audio_encoding>" + mfile.audio_encoding
								+ "</audio_encoding>";
                    if (mfile.audio_bitrate != null)						
                        xmlText += "<audio_bit_rate>" + mfile.audio_bitrate
								+ "</audio_bit_rate>";
                    if (mfile.audio_bitrate != null)						
                        xmlText += "<audio_sample_rate>"
								+ mfile.audio_sample_rate
								+ "</audio_sample_rate>";
                    if (mfile.audio_bitrate != null)
						xmlText += "<audio_channels>" + mfile.audio_channels
								+ "</audio_channels>";

                    if(mfile.duration != null && mfile.duration != 0)
					    xmlText += "<duration>" + mfile.duration + "</duration>";
					xmlText += "<filesize>" + mfile.size + "</filesize>";
					xmlText += "</part>";
				}
				xmlText += "</parts>";
				mrLogger.debug(j);
				mrLogger.debug(count);
				mrLogger.debug(xmlText);
				var remote = getPreference("remoteHost", "String");
				var url = "http://" + remote + "/parts/complete";
				mrLogger.debug(url);
				var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
						.createInstance(Components.interfaces.nsIDOMEventTarget);
				request.QueryInterface(Components.interfaces.nsIXMLHttpRequest);
				request.addEventListener("error", function(evt) {
					parser.error(evt);
				}, false);
				request.open("PUT", url, false);
				request.send(xmlText);
			}
		}
	},
	readMovieInfo : function() {
		var check_sum = this.tmp[0];
		var part = PartController.findByChecksum(check_sum);
		if (part != null) {
			var file = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
			file.initWithPath(part.path);
			try {
				var movieData = MovieFile.getObjectByFile(file);
				this.incompleteParts.push(new Array(check_sum, movieData));
			} catch (exc) {
				mrLogger.debug(exc);
			}
		}
	},
	handleIncomplete : function(event) {
		var response = event.currentTarget.responseText;
		if (isJSON(response)) {
			mrLogger.debug("incomplete on remote: " + response);
			var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
					.createInstance(Components.interfaces.nsIJSON);

			var parts = nativeJSON.decode(response);

			for (var i = 0; i < parts.length; i++) {
				//mrLogger.debug("incomplete: " + parts[i].check_sum);
				var vars = new Array(parts[i].check_sum);
				this.setNextStep("this.readMovieInfo()", vars);
			}
		} else {
			mrLogger.debug("response is not json: " + response);
		}
	}

}

var parser = new DirParser();
