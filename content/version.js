// *******************************************************************************
// * movierok.ff
// *
// * File: version.js
// * Description: class for the version handling
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************


var Version = {
    getExtensionVersion : function () {
        var gExtensionManager = Components.classes["@mozilla.org/extensions/manager;1"]
			.getService(Components.interfaces.nsIExtensionManager);
	    var current = gExtensionManager.getItemForID("extension@movierok.org").version;
	    return current;
    },
    setVersion : function (version) {
        if(this.getDBVersion() == null){
            this.insertVersion(version);
        }
        else {
            this.updateVersion(version);
        }
    },
    insertVersion : function(version) {
		var sql = "INSERT INTO version (id, version) VALUES (1,?1)";
		var statement = MRData.dbConnection().createStatement(sql);
        statement.bindUTF8StringParameter(0, version);
		statement.execute();
		statement.reset();
	},
	updateVersion : function(version) {
		var sql = "UPDATE version SET version=?1 WHERE id = 1";
		var statement = MRData.dbConnection().createStatement(sql);
		statement.bindUTF8StringParameter(0, version);
		statement.execute();
		statement.reset();
	},
	getDBVersion : function() {
        var version = null;
        try {
            var sql = "SELECT version FROM version WHERE id = 1";
		    var statement = MRData.dbConnection().createStatement(sql);

		    while (statement.executeStep()) {
		    	version = statement.getString(0);
		    }
        }catch(e){
        }
        return version;
	},
    check : function() {
	    var ver = "-1", firstrun = true;
	    var current = this.getExtensionVersion();
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
                this.setVersion(current);
		    }
		    if (ver != current && !firstrun) {
		    	setPreference("version", current, "String");
		    	mrLogger.info("movierok extension successfully updated");
                this.setVersion(current);
		    }
	    }
        mrLogger.debug(this.getDBVersion() + "-" + current);
        if(this.getDBVersion() == null || this.getDBVersion() != current){
            MRData.createDB();
            this.setVersion(current);
        }
    }
};
