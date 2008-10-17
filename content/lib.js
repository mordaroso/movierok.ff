// *******************************************************************************
// * movierok.ff
// *
// * File: lib.js
// * Description: global helper methods for the extension
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

$ = function(id, doc) {
	if (doc)
		return doc.getElementById(id);
	else
		return document.getElementById(id);
}

isJSON = function(str) {
	if (/^\s*$/.test(str))
		return false;
	return /^[\],:{}\s]*$/.test(str.replace(/\\["\\\/bfnrtu]/g, '@').replace(
			/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
			']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''));

}

isValidForXML = function(str) {
  if (str == null)
    return false;
	if (/^\s*$/.test(str))
		return false;
	return /^[\sA-Za-z0-9\\\/\-\$\^\*\(\)\+_!&%@#]*$/.test(str);
}

getChildNodes = function(element) {
	var jj = 0;
	var results = new Array;
	for (var j = 0, child; child = element.childNodes[j]; j++) {
		if (child.nodeType == 1 && child.tagName != '!')
			results[jj++] = child;
	}
	return results;
}

toUrl = function(urlTxt) {
	var ios = Components.classes["@mozilla.org/network/io-service;1"]
			.getService(Components.interfaces.nsIIOService);
	return ios.newURI(urlTxt, null, null);
}

urlToString = function(url) {
	while (url.search('%20') != -1) {
		url = url.replace(/%20/, ' ')
	}
	return url;
}

getElementsByClassName = function(oElm, strTagName, strClassName) {
	var arrElements = (strTagName == "*" && oElm.all) ? oElm.all : oElm
			.getElementsByTagName(strTagName);
	var arrReturnElements = new Array();
	strClassName = strClassName.replace(/\-/g, "\\-");
	var oRegExp = new RegExp("(^|\\s)" + strClassName + "(\\s|$)");
	var oElement;
	for (var i = 0; i < arrElements.length; i++) {
		oElement = arrElements[i];
		if (oRegExp.test(oElement.className)) {
			arrReturnElements.push(oElement);
		}
	}
	return (arrReturnElements)
};

removeClassName = function(element, className){
    element.className = element.className.replace(className, ' ');
    return element;
}

launchProgram = function(exePath, arguments) {
	try {
		// create an nsILocalFile for the executable
		var file = Components.classes["@mozilla.org/file/local;1"]
				.createInstance(Components.interfaces.nsILocalFile);
		file.initWithPath(exePath);

		// create an nsIProcess
		var process = Components.classes["@mozilla.org/process/util;1"]
				.createInstance(Components.interfaces.nsIProcess);
		process.init(file);

		var args = new Array().concat(arguments);
		process.run(false, args, args.length);

		return true;
	} catch (exc) {
		alert(exc);
	}
	return false;
};

hashString = function(string, algorithm) {
	var converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
			.createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
	converter.charset = "UTF-8";
	var result = {};
	var data = converter.convertToByteArray(string, result);
	var ch = Components.classes["@mozilla.org/security/hash;1"]
			.createInstance(Components.interfaces.nsICryptoHash);
	ch.initWithString(algorithm);
	ch.update(data, data.length);
    // pass false here to get binary data back
	var hash = ch.finish(false);

	var s = '';
	for (i in hash) {
		s += toHexString(hash.charCodeAt(i));
	}

	return s;
}

hashFile = function (file, algorithm){
    var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
                        .createInstance(Components.interfaces.nsIFileInputStream);
    // open for reading
    istream.init(file, 0x01, 0444, 0);
    var ch = Components.classes["@mozilla.org/security/hash;1"]
                   .createInstance(Components.interfaces.nsICryptoHash);
    ch.initWithString(algorithm);
    // this tells updateFromStream to read the entire file
    const PR_UINT32_MAX = 0xffffffff;
    ch.updateFromStream(istream, PR_UINT32_MAX);
    // pass false here to get binary data back
    var hash = ch.finish(false);

    // convert the binary hash data to a hex string.
    istream.close();
    return [toHexString(hash.charCodeAt(i)) for (i in hash)].join("");
}

Hash = function() {
	this.length = 0;
	this.items = new Array();
	for (var i = 0; i < arguments.length; i += 2) {
		if (typeof(arguments[i + 1]) != 'undefined') {
			this.items[arguments[i]] = arguments[i + 1];
			this.length++;
		}
	}
	this.addHash = function(hash) {
		for (var key in hash.items) {
			this.setItem(key, hash.getItem(key));
		}
	}
	this.removeHash = function(hash) {
		for (var key in hash.items) {
			this.removeItem(key);
		}
	}
	this.removeItem = function(in_key) {
		var tmp_value;
		if (typeof(this.items[in_key]) != 'undefined') {
			this.length--;
			var tmp_value = this.items[in_key];
			delete this.items[in_key];
		}

		return tmp_value;
	}

	this.getItem = function(in_key) {
		return this.items[in_key];
	}

	this.setItem = function(in_key, in_value) {
		if (typeof(in_value) != 'undefined') {
			if (typeof(this.items[in_key]) == 'undefined') {
				this.length++;
			}

			this.items[in_key] = in_value;
		}

		return in_value;
	}

	this.hasItem = function(in_key) {
		return typeof(this.items[in_key]) != 'undefined';
	}
	this.clone = function() {
		var clone = new Hash();
		clone.addHash(this);
		return clone;
	}
}

var MRokHasher = {
	getMRokHash : function(file) {
		return this.getMiddleBytes(file) + this.getShortSize(file);
	},
	getMiddleBytes : function(file) {
		// number of bytes to read in the middle of the file
		var count_bytes = 8;
		var middle_bytes = "";
		var istream = Components.classes["@mozilla.org/network/file-input-stream;1"]
				.createInstance(Components.interfaces.nsIFileInputStream);
		istream.QueryInterface(Components.interfaces.nsISeekableStream);
		istream.init(file, -1, -1, false);

		// if stream is not too small
		if (istream.available() >= count_bytes) {

			// jump to middle
			istream.seek(Components.interfaces.nsISeekableStream.NS_SEEK_SET,
					istream.available() / 2 - count_bytes / 2);

			var bstream = Components.classes["@mozilla.org/binaryinputstream;1"]
					.createInstance(Components.interfaces.nsIBinaryInputStream);
			bstream.setInputStream(istream);
			var zero_bytes = "";
			for (var i = 0; i < count_bytes; i++) {
				zero_bytes += "00";
				middle_bytes += toHexString(bstream.read8());
			}
			if (middle_bytes == zero_bytes) {
				throw ("File not readable!");
			}
		} else {
			throw ("File not readable!");
		}
		bstream.close();
		istream.close();
		return middle_bytes;
	},
	getShortSize : function(file) {
		// number of the sort length
		var count_size_digits = 8;
		var fsize = file.fileSize.toString();
		if (fsize.length < count_size_digits) {
			var zeros = '';
			for (var i = 0; i < count_size_digits - fsize.length; i++)
				zeros += "0";
			fsize = zeros + fsize;
		} else if (fsize.length > count_size_digits) {
			fsize = fsize.substring(fsize.length - count_size_digits);
		}
		return fsize;
	}
};

toHexString = function(charCode) {
	return ("0" + charCode.toString(16)).slice(-2).toUpperCase();
}

getPreference = function(name, type) {
	try {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService);
		prefs = prefs.getBranch("extensions.movierok.");
		if (type == "String")
			return prefs.getCharPref(name);
		else if (type == "boolean")
			return prefs.getBoolPref(name);
		else if (type == "int")
			return prefs.getIntPref(name);
		else
			return "type incorrect"
	} catch (exc) {
		return exc;
	}
};

setPreference = function(name, value, type) {
	try {
		var prefs = Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefService);
		prefs = prefs.getBranch("extensions.movierok.");
		if (type == "String")
			prefs.setCharPref(name, value);
		else if (type == "boolean")
			prefs.setBoolPref(name, value);
		else if (type == "int")
			prefs.setIntPref(name, value);
		else
			return "type incorrect"
	} catch (exc) {
		return exc;
	}
};

openUrlToNewTab = function (url) {
    var windowManager = (Components.classes["@mozilla.org/appshell/window-mediator;1"])
        .getService();
    var windowManagerInterface = windowManager
        .QueryInterface(Components.interfaces.nsIWindowMediator);
    var browser = (windowManagerInterface        .getMostRecentWindow("navigator:browser")).getBrowser();
    var newTab = browser.addTab(url);
    browser.selectedTab = newTab;
}

hasClassName =  function(element, className) {
    var elementClassName = element.className;
    return (elementClassName.length > 0 && (elementClassName == className ||
      new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
}
