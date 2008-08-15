// *******************************************************************************
// * movierok.ff
// *
// * File: part.js
// * Description: part class and controller
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

/*
 * Part Class
 */
var Part = function() {
	this.id = null;
	this.path = null;
	this.dir = null;
	this.mrokhash = null;
	this.db_connection = MRData.dbConnection();
}

Part.prototype = {
	save : function() {
		if (this.id === null) {
			this.id = this.insertPart();
		} else {
			this.updatePart();
		}
	},
	remove : function() {
		var sql = "DELETE FROM parts WHERE id =?1";
		var statement = this.db_connection.createStatement(sql);
		statement.bindUTF8StringParameter(0, this.id);
		statement.execute();
		statement.reset();
	},
	insertPart : function() {
		var sql = "INSERT INTO parts (dir, path, mrokhash) VALUES (?1,?2,?3)";
		var statement = this.db_connection.createStatement(sql);
		statement.bindUTF8StringParameter(0, this.dir);
		statement.bindUTF8StringParameter(1, this.path);
		statement.bindUTF8StringParameter(2, this.mrokhash);
		statement.execute();
		statement.reset();
		return this.db_connection.lastInsertRowID;
	},
	updatePart : function() {
		var sql = "UPDATE parts SET dir=?1, path=?2, mrokhash=?3 WHERE id = ?4";
		var statement = this.db_connection.createStatement(sql);
		statement.bindUTF8StringParameter(0, this.dir);
		statement.bindUTF8StringParameter(1, this.path);
		statement.bindUTF8StringParameter(2, this.mrokhash);
		statement.bindUTF8StringParameter(3, this.id);
		statement.execute();
		statement.reset();
	},
	getShortPath : function() {
		var sql = "SELECT m.path FROM movie_dirs m, dirs d WHERE m.id = d.movie_dir AND d.id = ?1";
		var statement = this.db_connection.createStatement(sql);
		statement.bindInt32Parameter(0, this.dir);

		var movieDirPath = "";
		while (statement.executeStep()) {
			movieDirPath = statement.getString(0);
		}
		statement.reset();
		return this.path.substr(movieDirPath.length+1);
	},
    getFile : function () {
        var file = Components.classes["@mozilla.org/file/local;1"]
		    .createInstance(Components.interfaces.nsILocalFile);
        mrLogger.debug(this.path);
		file.initWithPath(this.path);
        return file;
    },
    getMD5 : function () {
       return hashFile(this.getFile(), "MD5");
    },
    getMetaData : function (){
        return MovieFile.getMetaDataByFile (this.getFile());
    }
};

/*
 * PartController Object
 */
var PartController = {
	isPart : function(path) {
		if (path.lastIndexOf(".") == -1)
			return false;
		var ending = path.substring(path.lastIndexOf(".") + 1);
		var partEndings = getPreference("partEndings", "String").split(",");
		for (var i = 0; i < partEndings.length; i++) {
			if (ending == partEndings[i]) {
				return true;
			}
		}
		return false;
	},
	partsToXML : function(mrokhashes) {
		var content = "<parts>";
		for (var mrokhash in mrokhashes) {
			content += "<part><mrokhash>" + mrokhash + "</mrokhash></part>";
		}
		content += "</parts>";
		return content;
	},
	statementToObject : function(statement) {
		var part = new Part();
		part.id = statement.getInt32(0);
		part.dir = statement.getInt32(1);
		part.path = statement.getString(2);
		part.mrokhash = statement.getString(3);
		return part;
	},
	findByMRokHash : function(mrokhash) {
		var sql = "SELECT id, dir, path, mrokhash FROM parts WHERE mrokhash = ?1";
		var statement = MRData.dbConnection().createStatement(sql);
		statement.bindUTF8StringParameter(0, mrokhash);
		var result = [];
		while (statement.executeStep()) {
			result.push(this.statementToObject(statement));
		}
		statement.reset();
		if (result.length > 0)
			return result[0];
		else
			return null;
	},
	findShadowParts : function() {
		var sql = "SELECT id, dir, path, mrokhash FROM parts WHERE dir in( SELECT id FROM dirs WHERE movie_dir not in (SELECT id FROM movie_dirs))";
		var statement = MRData.dbConnection().createStatement(sql);
		var result = [];
		while (statement.executeStep()) {
			result.push(this.statementToObject(statement));
		}
		statement.reset();
		return result;
	},
	findByDir : function(dir_id) {
		var sql = "SELECT id, dir, path, mrokhash FROM parts WHERE dir = ?1";
		var statement = MRData.dbConnection().createStatement(sql);
		statement.bindInt32Parameter(0, dir_id);
		var result = [];
		while (statement.executeStep()) {
			result.push(this.statementToObject(statement));
		}
		statement.reset();
		return result;
	},
	findOrInitializeByMRokHash : function(file) {
		var mrokhash = MRokHasher.getMRokHash(file);
		var sql = "SELECT id, dir, path, mrokhash FROM parts WHERE mrokhash = ?1";
		var statement = MRData.dbConnection().createStatement(sql);
		statement.bindUTF8StringParameter(0, mrokhash);
		var result = [];
		while (statement.executeStep()) {
			result.push(this.statementToObject(statement));
		}
		statement.reset();
		if (result.length > 0)
			return result[0];
		else {
			var part = new Part();
			part.mrokhash = mrokhash;
			return part;
		}
	}
}
