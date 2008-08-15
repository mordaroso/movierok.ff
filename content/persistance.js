// *******************************************************************************
// * movierok.ff
// *
// * File: persistance.js
// * Description: class for the sqlite connection
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

var MRDatabase = function() {
	//this.createDB();
};
MRDatabase.prototype = {
	Version : '0.0.1',
	dbcon : null,

	dbConnection : function() {
		if (this.dbcon === null) {
			var file = Components.classes["@mozilla.org/file/directory_service;1"]
					.getService(Components.interfaces.nsIProperties).get(
							"ProfD", Components.interfaces.nsIFile);
			file.append("movierok.sqlite");
			var storageService = Components.classes["@mozilla.org/storage/service;1"]
					.getService(Components.interfaces.mozIStorageService);
			this.dbcon = storageService.openDatabase(file);
		}
		return this.dbcon;
	},
	getService : function() {
		var storageService = Components.classes["@mozilla.org/storage/service;1"]
				.getService(Components.interfaces.mozIStorageService);
		return storageService;
	},

	createDB : function() {
		this
				.dbConnection()
				.executeSimpleSQL("CREATE TABLE IF NOT EXISTS movie_dirs (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL)");
		this
				.dbConnection()
				.executeSimpleSQL("CREATE TABLE IF NOT EXISTS dirs (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, movie_dir INTEGER NOT NULL, hash TEXT)");
		this
				.dbConnection()
				.executeSimpleSQL("CREATE TABLE IF NOT EXISTS parts (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, dir INTEGER NOT NULL, mrokhash TEXT)");
        this
				.dbConnection()
				.executeSimpleSQL("CREATE TABLE IF NOT EXISTS version (id INTEGER NOT NULL PRIMARY KEY, version TEXT NOT NULL)");
        mrLogger.debug("DB created");
    }
};
MRData = new MRDatabase();
