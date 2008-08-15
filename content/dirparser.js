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
	this.metaDataArray;
	this.totalSteps;
	this.finishedSteps;
    this.pendingMD5 = null;
    this.tasks = new Array();
    this.doneTasks = 0;
    this.thread = null;
}
DirParser.prototype = {
	stop : function() {
		MovierokChrome.setStatus("endparsing");
		if (this.stepInterval) {
			window.clearInterval(this.stepInterval);
			this.stepInterval = null;
		}
        if(this.thread != null)
            this.thread.shutdown();
		this.running = false;
		this.status = 'ready';
		mrLogger.info("Dirparser finished");
	},
    startTask : function() {
        var task = this.tmp[0];
        mrLogger.debug("start task: #"+task);
        switch(task){
            case("0"):{
                // INIT
                MovierokChrome.setText(stringsBundle.getString("task.init"));
                if (this.sync) {
			        this.setNextStep("this.getPartsOnRemote()", null);
		        }
		        this.setNextStep("this.init()", null);
                this.setNextStep("this.checkVersion()", null);
                break;
            }
            case("1"):{
                // PARSE
                MovierokChrome.setText(stringsBundle.getString("task.parse"));
                this.setNextStep("this.checkMovieDirs()", null);
                break
            }
            case("2"):{
                // SAVE
                MovierokChrome.setText(stringsBundle.getString("task.save"));
		        this.setNextStep("this.sendPartsToRemote()", null);
                this.setNextStep("this.removeShadows()", null);
                break;
            }
            case("3"):{
                // MOVIEINFO
                MovierokChrome.setText(stringsBundle.getString("task.movieinfo"));
                this.metaDataArray = new Array();
                this.setNextStep("this.sendMetaData()", null);
                this.setNextStep("this.getNoMetaData()", null);
                break;
            }
            case("4"):{
                // CHECKSUM
                var infotext = stringsBundle.getString('task.md5');
	            infotext = infotext.replace(/\$\d/g, "?");
		        MovierokChrome.setText(infotext);
                this.metaDataArray = new Array();
                this.setNextStep("this.getNoMD5()", null);
                break;
            }
            default:{
                mrLogger.warning("Task #"+task+" not found!");
            }
        }

    },
    endTask : function () {
        var task = this.tmp[0];
        mrLogger.debug("end task: #"+task);
        this.doneTasks++;
        this.updatePercentage();

        if(this.doneTasks == this.tasks.length)
            this.stop();

    },
    updatePercentage : function(){
        var nbrOfSteps = this.totalSteps-this.tasks.length;
        var maxPercentageInStep = (100/this.tasks.length)*this.doneTasks;
        MovierokChrome.setPercent(Math.floor(maxPercentageInStep / nbrOfSteps
            * this.finishedSteps));
    },
	start : function() {
		MovierokChrome.setStatus("parsing");
        mrLogger.info("Start dirparser...");
		this.steps = new Array();
		this.stepVars = new Array();
		this.totalSteps = 0;
		this.finishedSteps = 0;
        this.doneTasks = 0;

        for (var i in this.tasks){
            var task = new Array(this.tasks[i]);
            this.addStep("this.startTask()", task);
            this.addStep("this.endTask()", task);
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
		if (this.running || this.thread != null)
			return
		if (this.steps.length > 0) {
			try {
				this.running = true;
				var step = this.steps[0];
				this.tmp = this.stepVars[0];
				this.steps.shift();
				this.stepVars.shift();

				eval(step);

				this.running = false;
				this.finishedSteps++;
                this.updatePercentage();
			} catch (exc) {
				mrLogger.error(exc);
				this.stop();
			}
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
			if (versions[i] == Version.getExtensionVersion()) {
				isCompatible = true;
			}
		}
		if (!isCompatible) {
			this.status = 'error';
			MovierokChrome.setStatus("error");
			MovierokChrome.setText(stringsBundle.getString("error.version"));
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
				part = new Part();
				part.mrokhash = parts[i].mrokhash;
				this.oldParts.setItem(parts[i].mrokhash, part);
				this.orgParts = this.oldParts.clone();
			}
		} else {
			mrLogger.debug("response is not json: " + response);
			this.error(event);
		}
	},
	error : function(event) {
		var error = 'error.connection';
		if (event.currentTarget.status == 401) {
			mrLogger
					.error("Login to remote failed! Please check if cookies are enabled and login on the remote page.");

			error = 'error.auth';
		} else {
			mrLogger.warning("AJAX finished with state: "
					+ event.currentTarget.status);
		}
		this.status = 'error';
		MovierokChrome.setStatus("error");
		MovierokChrome.setText(stringsBundle.getString(error));
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
				var errortext = stringsBundle.getString('error.moviedir');
				errortext = errortext.replace(/\$\d/g, this.moviedirs[i].path);
				MovierokChrome.setText(errortext);

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
				this.oldParts.setItem(parts[i].mrokhash, parts[i]);
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
			part = PartController.findOrInitializeByMRokHash(file);
		} catch (exc) {
			return;
		}
		if (this.newParts.hasItem(part.mrokhash)) {
			mrLogger.debug("twice found: " + file.path);
		} else if (part.path == null) {
			part.path = file.path;
			part.dir = dir.id;
			this.newParts.setItem(part.mrokhash, part);
		} else if (part.path != file.path) {
			part.path = file.path;
			part.dir = dir.id;
			part.save();
			mrLogger.debug("moved : " + file.path);
		}
		if (this.sync && !this.orgParts.hasItem(part.mrokhash)) {
			this.newParts.setItem(part.mrokhash, part);
		}
		if (this.oldParts.hasItem(part.mrokhash))
			this.oldParts.removeItem(part.mrokhash)
	},
	removeShadows : function() {
		var parts = PartController.findShadowParts();
		DirController.removeShadowDirs();
		for (var i = 0; i < parts.length; i++) {
			this.oldParts.setItem(parts[i].mrokhash, parts[i]);
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

			for (var mrokhash in this.newParts.items) {
				this.newParts.getItem(mrokhash).save();
			}
			for (var mrokhash in this.oldParts.items) {
				if (this.oldParts.getItem(mrokhash).id != null)
					this.oldParts.getItem(mrokhash).remove();
			}
			for (var i = 0; i < this.changedDirs.length; i++) {
				this.changedDirs[i].save();
			}
		}
	},
	getNoMetaData : function() {
		var remote = getPreference("remoteHost", "String");
		var url = "http://" + remote + '/parts.json?without=movie_file_meta_data';
		var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance(Components.interfaces.nsIDOMEventTarget);
		request.QueryInterface(Components.interfaces.nsIXMLHttpRequest);
		request.addEventListener("load", function(evt) {
			parser.handleNoMetaData(evt);
		}, false);
		request.addEventListener("error", function(evt) {
			parser.error(evt);
		}, false);
		request.open("GET", url, false);
		request.send(null);
	},
	sendMetaData : function() {
		if (this.metaDataArray.length > 0) {
			var splitSize = 200;
			mrLogger.debug("count complete: "+this.metaDataArray.length);
			for (var j = 0; j < this.metaDataArray.length; j += splitSize) {
				var xmlText = "";
				xmlText += "<?xml version=\"1.0\" encoding=\"UTF-8\"?>";
				xmlText += "<parts>";
				for (var count = j; (count < (j  + splitSize)) && (count < this.metaDataArray.length); count++) {
					var check_sum = this.metaDataArray[count][0];
					var mfile = this.metaDataArray[count][1];
					xmlText += "<part>";
					xmlText += "<mrokhash>" + check_sum + "</mrokhash>";

                    // CONTAINER
						xmlText += "<container>" + mfile.container
								+ "</container>";

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
                    if (mfile.audio_sample_rate != null)
                        xmlText += "<audio_sample_rate>"
								+ mfile.audio_sample_rate
								+ "</audio_sample_rate>";
                    if (mfile.audio_channels != null)
						xmlText += "<audio_channels>" + mfile.audio_channels
								+ "</audio_channels>";

                    if(mfile.duration != null && mfile.duration != 0)
					    xmlText += "<duration>" + mfile.duration + "</duration>";
					xmlText += "<filesize>" + mfile.size + "</filesize>";
					xmlText += "</part>";
				}
				xmlText += "</parts>";
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
	readMetaData : function() {
		var check_sum = this.tmp[0];
		var part = PartController.findByMRokHash(check_sum);
		if (part != null) {		    var metaData = part.getMetaData();
            if (metaData !== null)
                this.metaDataArray.push(new Array(check_sum, metaData));
		}
	},
	handleNoMetaData : function(event) {
		var response = event.currentTarget.responseText;
		if (isJSON(response)) {
			mrLogger.debug("no meta data on remote: \n" + response);
			var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
					.createInstance(Components.interfaces.nsIJSON);

			var parts = nativeJSON.decode(response);

			for (var i in parts) {
				var vars = new Array(parts[i].mrokhash);
				this.setNextStep("this.readMetaData()", vars);
			}
		} else {
			mrLogger.debug("response is not json: " + response);
		}
	},
    getNoMD5 : function() {
		var remote = getPreference("remoteHost", "String");
		var url = "http://" + remote + '/parts.json?without=md5';
		var request = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
				.createInstance(Components.interfaces.nsIDOMEventTarget);
		request.QueryInterface(Components.interfaces.nsIXMLHttpRequest);
		request.addEventListener("load", function(evt) {
			parser.handleNoMD5(evt);
		}, false);
		request.addEventListener("error", function(evt) {
			parser.error(evt);
		}, false);
		request.open("GET", url, false);
		request.send(null);
	},
    handleNoMD5 : function(event) {
		var response = event.currentTarget.responseText;
		if (isJSON(response)) {
			mrLogger.debug("no md5 on remote: \n" + response);
			var nativeJSON = Components.classes["@mozilla.org/dom/json;1"]
					.createInstance(Components.interfaces.nsIJSON);

			var parts = nativeJSON.decode(response);
            this.pendingMD5 = parts.length;
            if(this.pendingMD5 > 0){
                var params = {nbrOfMD5:this.pendingMD5};
                if(getPreference("showMD5Popup", "boolean") == true){
                    window.openDialog("chrome://movierok/content/md5.xul", "", "dialog, chrome, width=550px, height=200px", params).focus();
                }
                for (var i in parts) {
				    var vars = new Array(parts[i].mrokhash);
                    this.setNextStep("this.getMD5()", vars);
			    }
            }

		} else {
			mrLogger.debug("response is not json: " + response);
		}
	},
    getMD5 : function () {
        var check_sum = this.tmp[0];
		var part = PartController.findByMRokHash(check_sum);
		if (part != null) {
            var infotext = stringsBundle.getString('task.md5');
	        infotext = infotext.replace(/\$\d/g, this.pendingMD5);
		    MovierokChrome.setText(infotext);
            this.thread = Components.classes["@mozilla.org/thread-manager;1"].getService().newThread(0);
            var main = Components.classes["@mozilla.org/thread-manager;1"].getService().mainThread;
            this.thread.dispatch(new md5Thread(this.pendingMD5, part, main, this.thread), this.thread.DISPATCH_NORMAL);
            this.pendingMD5--;
        }

    },
    sendMD5 : function (md5, threadId, mrokhash) {
	    this.thread = null;
	    var xmlText = "<parts>";
	    xmlText += "<part>";
	    xmlText += "<mrokhash>"+mrokhash+"</mrokhash>";
	    xmlText += "<md5>"+md5+"</md5>";
	    xmlText += "</part>";
	    xmlText += "</parts>";
	    mrLogger.debug(xmlText);
	    var remote = getPreference("remoteHost", "String");
	    var url = "http://" + remote + "/parts/complete";
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

var md5Thread = function(threadID, part, main, background) {
  this.threadID = threadID;
  this.main = main;
  this.part = part;
  this.md5 = "";
  this.background = background;
};

md5Thread.prototype = {
  run: function() {
    try {
        this.md5 = this.part.getMD5();

        this.main.dispatch(new mainThread(this.threadID, this.md5, this.part.mrokhash),
        this.background.DISPATCH_NORMAL);
    } catch(err) {
      Components.utils.reportError(err);
    }
  },

  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports)) {
            return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};


var mainThread = function(threadID, md5, mrokhash) {
  this.threadID = threadID;
  this.md5 = md5;
  this.mrokhash = mrokhash;
};

mainThread.prototype = {
  run: function() {
    try {
      parser.sendMD5(this.md5, this.threadID, this.mrokhash);
    } catch(err) {
      Components.utils.reportError(err);
    }
  },

  QueryInterface: function(iid) {
    if (iid.equals(Components.interfaces.nsIRunnable) ||
        iid.equals(Components.interfaces.nsISupports)) {
            return this;
    }
    throw Components.results.NS_ERROR_NO_INTERFACE;
  }
};


var parser = new DirParser();
