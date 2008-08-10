// *******************************************************************************
// * movierok.ff
// *
// * File: dir.js
// * Description: dir class and controller
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

/*
 * Dir Class
 */
var Dir = function() {
	this.id = null;
	this.path = null;
	this.moviedir = null;
	this.hash = null;
	this.file = null;
	this.db_connection = MRData.dbConnection();
};
Dir.prototype = {
	save : function() {
		if (this.id === null) {
			this.id = this.insertDir();
		} else {
			this.updateDir();
		}
	},
	remove : function() {
		var sql = "DELETE FROM dirs WHERE id =?1";
		var statement = this.db_connection.createStatement(sql);
		statement.bindUTF8StringParameter(0, this.id);
		statement.execute();
		statement.reset();
	},
	insertDir : function() {
		var sql = "INSERT INTO dirs (movie_dir, path, hash) VALUES (?1,?2,?3)";
		var statement = this.db_connection.createStatement(sql);
		statement.bindUTF8StringParameter(0, this.moviedir);
		statement.bindUTF8StringParameter(1, this.path);
		statement.bindUTF8StringParameter(2, this.hash);
		statement.execute();
		statement.reset();
		return this.db_connection.lastInsertRowID;
	},
	updateDir : function() {
		var sql = "UPDATE dirs SET movie_dir=?1, path=?2, hash=?3 WHERE id = ?4";
		var statement = this.db_connection.createStatement(sql);
		statement.bindUTF8StringParameter(0, this.moviedir);
		statement.bindUTF8StringParameter(1, this.path);
		statement.bindUTF8StringParameter(2, this.hash);
		statement.bindUTF8StringParameter(3, this.id);
		statement.execute();
		statement.reset();
	},
	getFile : function() {
		if (this.file === null) {
			this.file = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
			this.file.initWithPath(this.path);
		}
		return this.file;
	},
	generateHash : function() {
		var string = '';
		var files = this.getFilesInDir();
		for (var i = 0; i < files.length; i++) {
			try {
				string += files[i].leafName + files[i].fileSize;
			} catch (exc) {
			}
		}
		return hashString(string, 'SHA1');
	},
	getFilesInDir : function() {
		try {
			var entries = this.getFile().directoryEntries;
			var array = [];
			while (entries.hasMoreElements()) {
				var entry = entries.getNext();
				entry.QueryInterface(Components.interfaces.nsIFile);
				array.push(entry);
			}
			return array;
		} catch (exc) {
			return new Array();
		}
	},
	hasChanged : function() {
		if (this.generateHash() != this.hash) {
			return true;
		}
		return false;
	}
};

/*
 * DirController Object
 */
var DirController = {
	statementToObject : function(statement) {
		var dir = new Dir();
		dir.id = statement.getInt32(0);
		dir.moviedir = statement.getInt32(1);
		dir.path = statement.getString(2);
		dir.hash = statement.getString(3);
		return dir;
	},
	getAllDirs : function() {
		var statement = MRData.dbConnection()
				.createStatement("SELECT id, movie_dir, path, hash FROM dirs");
		var result = [];
		while (statement.executeStep()) {
			result.push(this.statementToObject(statement));
		}
		statement.reset();
		return result;
	},
	getDirsByMovieDir : function(moviedir) {
		var sql = "SELECT id, movie_dir, path, hash FROM dirs WHERE movie_dir = ?1 ";
		var statement = MRData.dbConnection().createStatement(sql);
		statement.bindUTF8StringParameter(0, moviedir);
		var result = [];
		while (statement.executeStep()) {
			result.push(this.statementToObject(statement));
		}
		statement.reset();
		return result;
	},
	removeShadowDirs : function() {
		var statement = MRData
				.dbConnection()
				.createStatement("DELETE FROM dirs WHERE movie_dir not in (SELECT id FROM movie_dirs)");
		statement.execute();
		statement.reset();
	},
	findOrInitializeByPath : function(path) {
		var sql = "SELECT id, movie_dir, path, hash FROM dirs WHERE path = ?1";
		var statement = MRData.dbConnection().createStatement(sql);
		statement.bindUTF8StringParameter(0, path);
		var result = [];
		while (statement.executeStep()) {
			result.push(this.statementToObject(statement));
		}
		statement.reset();
		if (result.length > 0)
			return result[0];
		else {
			var dir = new Dir();
			dir.path = path;
			return dir;
		}
	}
};
