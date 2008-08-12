// *******************************************************************************
// * movierok.ff
// *
// * File: logger.js
// * Description: The Class MRLogger handles the logging to the firefox console
// * or to a file
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

//
// Logger Class
// param String level - loglevel
// param boolean saveToFile - save to file?
// param String fileName - name of the logfile.
var MRLogger = function(level, saveToFile, fileName) {
	// log level (debug - error)
	switch (level) {
		case ("debug") :
			levelNr = 1;
			break;
		case ("info") :
			levelNr = 2;
			break;
		case ("warning") :
			levelNr = 3;
			break;
		case ("error") :
			levelNr = 4;
			break;
		case ("disabled") :
			levelNr = 5;
			break;
		default :
			levelNr = 5;
			break;
	}
	this.level = levelNr;
	// saving to file?
	this.saveToFile = saveToFile;
	// set filename
    this.fileName = fileName;
};

MRLogger.prototype = {
	// log an error
	error : function(text) {
		if (this.level < 5) {
			text = this.formatText("#d, #l: " + text, "ERROR");
			Components.utils.reportError(text);
			if (this.saveToFile)
				this.toFile(text);
		}
	},
	// log a warning
	warning : function(text) {
		if (this.level < 4) {
			text = this.formatText("#d, #l: " + text, "WARNING");
			Application.console.log(text);
			if (this.saveToFile)
				this.toFile(text);
		}
	},
	// log an info
	info : function(text) {
		if (this.level < 3) {
			text = this.formatText("#d, #l: " + text, "INFO");
			Application.console.log(text);
			if (this.saveToFile)
				this.toFile(text);
		}
	},
	// log a debugtext
	debug : function(text) {
		if (this.level < 2) {
			text = this.formatText("#d, #l: " + text, "DEBUG");
			Application.console.log(text);
			if (this.saveToFile)
				this.toFile(text);
		}
	},
	// format the logtext
	formatText : function(text, level) {
		var now = new Date();
		text = text.replace(/#d/, now.toLocaleString());
		text = text.replace(/#l/, level);
		return text;
	},
	// get the logfile
	getFile : function() {
		var file = Components.classes["@mozilla.org/file/directory_service;1"]
				.getService(Components.interfaces.nsIProperties).get("ProfD",
						Components.interfaces.nsIFile);
		file.append(this.fileName);
		if (!file.exists())
			file.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0666);
		return file;
	},
	// write text to logfile
	toFile : function(text) {
		try {
			var file = this.getFile();

			var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
					.createInstance(Components.interfaces.nsIFileOutputStream);
			foStream.init(file, 0x02 | 0x10, 0666, 0);
			text = text + "\n";
			foStream.write(text, text.length);
			foStream.close();
		} catch (e) {

		}

	}
};
