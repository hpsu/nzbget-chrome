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
	Implements: Events
	,initialize: function(){
	}
	,version: function() {
		return this.sendMessage('version', {}, false);
	}
	,history: function(async) {
		return this.sendMessage('history', {}, async);
	}
	,listFiles: function(async) {
		return this.sendMessage('listfiles', {}, async);
	}
	,listGroups: function(async) {
		return this.sendMessage('listgroups', {}, async);
	}
	,loadMenu: function(){
		chrome.storage.sync.get(function(options) {
			chrome.contextMenus.removeAll();

			chrome.contextMenus.create({
				contexts:['link'],
				id: '-1',
				title: 'Send to NZBGet',
				//parentId: parent,
				onclick: function() {alert('test')}
			});
		});
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
	,updateStatus: function() {
		this.status = this.sendMessage('status', {}, false).result;
		this.fireEvent('statusupdated');
	}
	,updateGroups: function() {
		this.listGroups((function(j){
			this.groups = j;
			this.fireEvent('groupsupdated');
			chrome.browserAction.setBadgeText({text: j.result.length ? j.result.length.toString() : ''});
		}).bind(this));
	}
	,Options: new nzbGetOptions()
});

window.addEvent('domready', function(){
	console.log('dom');
	ngAPI = new nzbGetAPI();
	chrome.browserAction.setBadgeText({text: ''});
	chrome.browserAction.setBadgeBackgroundColor({color: '#468847'});

	ngAPI.updateGroups();
	ngAPI.updateGroups.bind(ngAPI).periodical(5000);

	ngAPI.updateStatus();
	ngAPI.updateStatus.bind(ngAPI).periodical(5000);
	
	ngAPI.loadMenu();
	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
		if(message === 'updateOptions') {
			ngAPI.loadMenu();
		}
	});
});