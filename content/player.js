// *******************************************************************************
// * movierok.ff
// *
// * File: player.js
// * Description: looks for a default movieplayer on the client
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

var Player = {
	getDefalutPlayer : function() {
		var osString = Components.classes["@mozilla.org/xre/app-info;1"]
				.getService(Components.interfaces.nsIXULRuntime).OS;
		var players;
		if (osString == "WINNT") { // Windows
			players = this.getWinNtPlayers();
		} else if (osString == "Linux") { // Unix / Linux
			players = this.getLinuxPlayers();
		} else if (osString == "Darwin") { // OS X
			players = this.getDarwinPlayers();
		} else {
			return "";
		}
		return this.findPlayerByList(players);
	},
	findPlayerByList : function(list) {
		var foundPlayer = "";
		var file = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
		for (var i = 0; i < list.length; i++) {
			{
				try {
					file.initWithPath(list[i]);
					if (file.exists()) {
						foundPlayer = list[i];
						break;
					}
				} catch (exc) {
				}
			}
		}
		return foundPlayer;
	},
	getWinNtPlayers : function() {
		var players = new Array();
		// Priority in order of appearance
    var program_folder = Components.classes["@mozilla.org/file/directory_service;1"]
                     .getService(Components.interfaces.nsIProperties)
                     .get("ProgF", Components.interfaces.nsIFile);

		players.push(program_folder.path+"\\VideoLAN\\VLC\\vlc.exe");
		players.push(program_folder.path+"\\Windows Media Player\\wmplayer.exe");
		// TODO add more programs
		return players;
	},
	getLinuxPlayers : function() {
		var players = new Array();
		// Priority in order of appearance
		players.push("/usr/bin/vlc");
        players.push("/usr/bin/totem");
		// TODO add more programs
		return players;
	},
	getDarwinPlayers : function() {
		var players = new Array();
		// Priority in order of appearance
		players.push("/usr/bin/vlc");
		// TODO add more programs
		return players;
	}
};
