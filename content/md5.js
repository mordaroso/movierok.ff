// *******************************************************************************
// * movierok.ff
// *
// * File: md5.js
// * Description: javascript vars and methods for the md5 dialog
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

function init() {
    var value = document.getElementById("md5Info").textContent;
    value = value.replace(/\$\d/g, window.arguments[0].nbrOfMD5);
    document.getElementById("md5Info").textContent = value;
}

function ok(){
    setPreference("showMD5Popup", !document.getElementById("md5DontShow").checked, "boolean");
}
