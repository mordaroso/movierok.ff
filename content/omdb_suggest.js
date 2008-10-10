// *******************************************************************************
// * movierok.ff
// *
// * File: omdb_suggest.js
// * Description: omdb movie suggestion
// * Author : movierok team
// * Licence : see licence.txt
// *******************************************************************************

var omdb_suggestor

function init_omdb_suggest() {
    omdb_suggestor = new OMDBSuggestor()
    var omdb_search_form = window.content.document.getElementById("omdb_search_form")
    if (omdb_search_form) {
        omdb_search_form.addEventListener("DOMAttrModified", omdb_suggest, true)
        omdb_search_form.addEventListener("submit", omdb_suggest, false)
        if(omdb_suggestor.doc.getElementById('editing_rip_title')) {
            omdb_suggestor.doc.getElementById('omdb_search_field').value = omdb_suggestor.doc.getElementById('editing_rip_title').innerHTML
            omdb_suggestor.suggest()
        }
    }
}

function omdb_suggest(event) {
    omdb_suggestor.suggest(event)
}


/*
 * OMDBSuggestor Class
 */
var OMDBSuggestor = function() {
    this.doc = window.content.document
    this.omdb_suggestions = null
    this.last_term = ''
}

OMDBSuggestor.prototype = {
    suggest: function(event) {
        this.doc = window.content.document
        this.omdb_suggestions = this.doc.getElementById("omdb_suggestions")
        this.doc.getElementById("omdb_suggestions_box").style.display = 'block'
        term = this.doc.getElementById('omdb_search_field').value
	   
        if(event && event.type == 'DOMNodeInserted' && term == this.last_term) return
        this.last_term = term
	   
        if((term.replace (/^\s+/, '').replace (/\s+$/, '')).length > 0) {
            this.show_loading_image()
            this.make_omdb_request(term)
        } else {
            show_warning()
        }

    }
    ,
    make_omdb_request: function(term) {
        var xhr = new XMLHttpRequest()
        xhr.open("GET", "http://www.omdb.org/search/movies?search[text]=" + term, false)
        xhr.send(null)
    
        if (xhr.status == 200) {
            this.process_omdb_response(xhr.responseText)
        } else {
            this.show_error()
        }
    }
    ,
    process_omdb_response: function (response) {
        response = this.clean_html(response)
        var omdb_doc = (new DOMParser()).parseFromString(response,"text/xml")
        var resboxes = omdb_doc.getElementById('results').getElementsByClassName('result-box')
        if(resboxes.length > 0) {
            this.insert_suggestions(resboxes)
        } else {
            this.show_warning()
        }
    }
    ,
    insert_suggestions: function(resboxes) {
        this.omdb_suggestions.innerHTML = ''
        count = 0
        for(i in resboxes) {
            count++
            img = resboxes[i].childNodes[1]
            link = img.childNodes[1]
            id = link.href.substr(link.href.lastIndexOf("/") + 1)
            link.href = 'javascript:;'
            omdb_link = resboxes[i].childNodes[3]
            omdb_link.childNodes[1].href = "http://www.omdb.org/movie/" + id
            omdb_link.childNodes[1].target = "_blank"
            suggestions = '<div id="omdb_movie_' +id +'" class="omdb_movie" onclick="javascript: set_omdb(' +id +')">' + img.innerHTML + omdb_link.innerHTML + '</div>'
            this.omdb_suggestions.innerHTML += suggestions

            // workaround
            if(count == resboxes.length){
                id = this.doc.getElementById('rip_omdb').value
                if(this.doc.getElementById('omdb_movie_' + id)) {
                    this.doc.getElementById('omdb_movie_' + id).className += ' selected_movie'
                }
            }
        }
    }
    ,
    clean_html: function(response){
        return response.replace(/\/image\//g, 'http://www.omdb.org/image/').replace(/\/images\//g, 'http://www.omdb.org/images/').replace(/&/g, '&amp;')
    }
    
    ,
    show_warning: function() {
        this.omdb_suggestions.innerHTML = '<div id="omdb_suggestions_warning"><h4>no movies with this title found</h4>what you can do<ul><li>correct the movie title above and search again.</li><li>go to <a href="http://www.omdb.org/" target="_blank">omdb.org</a> and search there for your movie.<li>maybe your movie doesn\'t yet exist on omdb. so you have to create it first.</li></div>'
    }
    ,
    show_error: function() {
        this.omdb_suggestions.innerHTML = '<div id="omdb_suggestions_warning"><h4>sorry, something went wrong..</h4>maybe you wanna search on <a href="http://www.omdb.org/" target="_blank">omdb.org</a>.</div>'
    }
    ,
    show_loading_image: function() {
        this.omdb_suggestions.innerHTML = '<img src="/images/loading-gray.gif" alt="loading" style="margin: 70px auto; display: block;" />'
    }
}
