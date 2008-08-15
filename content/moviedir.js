// *******************************************************************************
// * movierok.ff
// *
// * File: moviedir.js
// * Description: moviedir class and controller
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

/*
 * MovieDir Class
 */

var MovieDir = function() {
	this.id = null;
	this.path = null;
	this.file = null;
	this.db_connection = MRData.dbConnection();
	this.save = function() {
		if (this.id === null) {
			this.id = this.insertMovieDir();
		} else {
			this.updateMovieDir();
		}
	};
	this.remove = function() {
		var sql = "DELETE FROM movie_dirs WHERE id =?1";
		var statement = this.db_connection.createStatement(sql);
		statement.bindUTF8StringParameter(0, this.id);
		statement.execute();
		statement.reset();
	};
	this.insertMovieDir = function() {
		var sql = "INSERT INTO movie_dirs (path) VALUES (?1)";
		var statement = this.db_connection.createStatement(sql);
		statement.bindUTF8StringParameter(0, this.path);
		statement.execute();
		statement.reset();
		return new MRDatabase().dbConnection().lastInsertRowID;
	};
	this.updateMovieDir = function() {
		var sql = "UPDATE movie_dirs SET path=?1 WHERE id = ?2";
		var statement = this.db_connection.createStatement(sql);
		statement.bindUTF8StringParameter(0, this.path);
		statement.bindUTF8StringParameter(1, this.id);
		statement.execute();
		statement.reset();
	};
	this.exists = function() {
		if (this.file === null) {
			this.file = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
			this.file.initWithPath(this.path);
		}
		return this.file.exists();
	};
	this.getFile = function() {
		if (this.file === null) {
			this.file = Components.classes["@mozilla.org/file/local;1"]
					.createInstance(Components.interfaces.nsILocalFile);
			this.file.initWithPath(this.path);
		}
		return this.file;
	};

};

/*
 * MovieDirController Class
 */
var MovieDirController = {
	getAllMovieDirs : function() {
		var statement = MRData.dbConnection()
				.createStatement("SELECT id, path FROM movie_dirs");
		var result = [];
		while (statement.executeStep()) {
			var moviedir = new MovieDir(MRData.dbConnection());
			moviedir.id = statement.getInt32(0);
			moviedir.path = statement.getString(1);
			result.push(moviedir);
		}
        statement.reset();
		return result;
	}
};
