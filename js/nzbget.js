/**
 * nzbGetAPI - Base API Class
 */
 window.ngAPI = {
	version: function() {
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
				onclick: window.ngAPI.addLink
			});
		});
	}
	,sendMessage: function(method, params, async, fail_func) {
		var url = this.Options.get('opt_host')
		,port = this.Options.get('opt_port')
		,username = this.Options.get('opt_username')
		,password = this.Options.get('opt_password')
		,query = {
			version: '1.1'
			,method: method
			,params: params
		};

		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function(r){
			if (xhr.readyState == 4) {
				if(xhr.status == 200) {
					if(typeof async === 'function')
						async(JSON.parse(r.target.responseText));
				} else {
					if(typeof fail_func === 'function')
						fail_func(JSON.parse(r.target.responseText));
				}
			}
		};
		xhr.open('POST', 'http://' + url + ':' + port + '/jsonrpc', typeof async === 'function');
		xhr.setRequestHeader('Content-Type','text/json');
		xhr.setRequestHeader('Authorization','Basic '+ window.btoa(username + ':' + password)); // Use Authorization header instead of passing user/pass. Otherwise request fails on larger nzb-files!?
		xhr.send(JSON.stringify(query));

		if(!async) {
			return JSON.parse(xhr.responseText);
		}
	}
	,addLink: function(info, tab) {
		var nzbFileName = info.linkUrl.match(/\/([^\/]+)$/)[1];
		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function(){
			if (xhr.readyState == 4) {
				if(xhr.status == 200) {
					if(xhr.getResponseHeader('Content-Type') === "application/x-nzb") {
						/* Replace NZB file name with the one specified in response header if available. */
						var disposition = xhr.getResponseHeader('Content-Disposition');
						if(disposition) {
							match = disposition.replace(/.+filename=["']?([^'":;]+).*$/i, '$1');
							if(match) {
								nzbFileName = match.replace('.nzb','');
							}
						}
						window.ngAPI.sendMessage('append', [nzbFileName + ".nzb", '', 0, false, window.btoa(xhr.responseText)],
							function() {
								window.ngAPI.updateGroups();
							},
							function() {
								console.log('spectacular failure!');
							}
						);
					} else {
						console.log('Not an nzb file!?');
					}
				}
			}
		};
		xhr.open('POST', info.linkUrl);
		xhr.send();
	}
	,updateStatus: function() {
		this.status = this.sendMessage('status', {}, false).result;
		chrome.runtime.sendMessage({statusUpdated: 'status'});
	}
	,updateGroups: function() {
		this.listGroups((function(j){
			this.groups = j;
			chrome.browserAction.setBadgeText({text: j.result.length ? j.result.length.toString() : ''});
			chrome.runtime.sendMessage({statusUpdated: 'groups'});
		}).bind(this));
	}
	,Options: {
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
	}
}

document.addEventListener('DOMContentLoaded', function() {
	console.log('dom loaded');
	chrome.browserAction.setBadgeText({text: ''});
	chrome.browserAction.setBadgeBackgroundColor({color: '#468847'});

	ngAPI.updateGroups();
	setInterval(ngAPI.updateGroups.bind(ngAPI), 5000);
	setInterval(ngAPI.updateStatus.bind(ngAPI), 5000);
	
	ngAPI.loadMenu();
	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
		if(message === 'updateOptions') {
			ngAPI.loadMenu();
		}
	});
});