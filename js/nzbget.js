function main() {
	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
		if ( message === "updateOptions" ) {
			nzbGetChrome.loadMenu();
		}
	});

    nzbGetChrome.loadMenu();
}

nzbGetOptions = new Class({
	load: function() {
		Array.each($$('input[type=text],input[type=password]'), function(o){
			o.value = this.get(o.id);
		},this);
	}
	,save: function() {
		Array.each($$('input[type=text],input[type=password]'), function(o){
			console.log('set',o.value);
			localStorage[o.id] = o.value;
		},this);
	}
	,get: function(opt) {
		return typeof localStorage[opt] != 'undefined' ? localStorage[opt] : '';
	}
	,set: function(opt, value) {
		localStorage[opt] = value;
	}
});

nzbGetAPI = new Class({
	initialize: function(){
	}
	,version: function() {
		return this.sendMessage('version', {}, false);
	}
	,status: function() {
		return this.sendMessage('status', {}, false);
	}
	,history: function(async) {
		return this.sendMessage('history', {}, async);
	}
	,sendMessage: function(method, params, async) {
        var url = this.Options.get('opt_host')
        	,port = this.Options.get('opt_port')
        	,username = this.Options.get('opt_username')
        	,password = this.Options.get('opt_password')
			,query = {
	            version: '1.1'
	            ,method: method
	            ,params: params
	        };

        xhr = new Request.JSON({
        	url: 'http://' + url + ":" + port + "/jsonrpc"
        	,async: async
        	,data: JSON.stringify(query)
        	,user: username
        	,password: password
        	,onComplete: async
        }).send();
        if(!async) {
        	return JSON.parse(xhr.xhr.response);
        }
	}
	,Options: new nzbGetOptions()
});

window.addEvent('domready', function(){
	ngAPI = new nzbGetAPI();
});

