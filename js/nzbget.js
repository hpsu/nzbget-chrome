/**
 * nzbGetAPI - Base API Class
 */
 window.ngAPI = {
 	groupTimer: null
 	,statusTime: null
 	,isInitialized: false
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
	/**
	 * Download a file and try to send it to NZBGet
	 *
	 * @TODO: Better error notification
	 * @var info chrome OnClickData-object
	 * @var tab chrome tabs.Tab-object
	 */
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
	/**
	 * Locate existing NZBGet-tab or open a new one
	 */
	,switchToNzbGetTab: function() {
		var url = this.Options.get('opt_host')
		,port = this.Options.get('opt_port')
		,username = this.Options.get('opt_username')
		,password = this.Options.get('opt_password');
		chrome.tabs.query({url: 'http://' + url + '/*'}, function(tabs) {
			if(tabs.length) {
				chrome.tabs.update(tabs[0].id, {selected: true});
			} else {
				chrome.tabs.create({url: 'http://' + username + ':' + password + '@' + url + ":" + port});
			}
		});
	}
	/**
	 * Display notification for 5 sec
	 *
	 * @var header
	 * @var message
	 */
	,notify: function(header, message) {
		var n = new Notification(header, {icon: 'img/nzbget-icon.svg', body: message});
		n.onshow = function(){
			setTimeout(function() {n.close();}, 5000);
		};
		n.onclick = function() {
			window.ngAPI.switchToNzbGetTab();
		}
	}
	/**
	 * Request new status information via NZBGET JSON-RPC.
	 */
	,updateStatus: function() {
		this.sendMessage('status', {}, function(j){
			this.status = j.result;
			chrome.runtime.sendMessage({statusUpdated: 'status'});
		}.bind(this));
	}
	/**
	 * Request new group information via NZBGET JSON-RPC.
	 * Notifies on complete downloads 
	 * Updates badge on active downloads.
	 */
	,updateGroups: function() {
		this.listGroups((function(j){
			var newIDs = [];
			for(i in j.result) {
				newIDs[j.result[i].NZBID] = true;
			}

			if(this.groups) for(i in this.groups.result) {
				if(!newIDs[this.groups.result[i].NZBID]) {
					window.ngAPI.notify('Download complete!', this.groups.result[i].NZBName);
					chrome.runtime.sendMessage({statusUpdated: 'history'});
				}
			}
			this.groups = j;
			chrome.browserAction.setBadgeText({text: j.result.length ? j.result.length.toString() : ''});
			chrome.runtime.sendMessage({statusUpdated: 'groups'});
		}).bind(this));
	}
	/**
	 * Setup polling timers and stuff
	 *
	 * @return bool success
	 */
	,initialize: function(){
		console.log('initialize');
		if(this.groupTimer) clearInterval(this.groupTimer);
		if(this.statusTimer) clearInterval(this.groupTimer);
		if(ngAPI.Options.get('opt_host').length === 0) {
			return this.isInitialized = false;
		}

		chrome.browserAction.setBadgeText({text: ''});
		chrome.browserAction.setBadgeBackgroundColor({color: '#468847'});

		this.status = {DownloadRate: 0, RemainingSizeMB: 0, RemainingSizeLo: 0};
		this.updateGroups();
		this.updateStatus();
		this.loadMenu();

		this.groupTimer = setInterval(this.updateGroups.bind(this), 5000);
		this.statusTimer = setInterval(this.updateStatus.bind(this), 5000);
		return this.isInitialized = true;
	}
	/**
	 * Option abstraction object. Handles everyting option related.
	 */
	,Options: {
		load: function() {
			Array.each($$('input[type=text],input[type=password]'), function(o){
				o.value = this.get(o.id);
			},this);
		}
		,save: function() {
			Array.each($$('input[type=text],input[type=password]'), function(o){
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
	ngAPI.initialize();
	
	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
		if(message === 'optionsUpdated') {
			ngAPI.initialize();
		}else {
			console.log(message);
		}
	});
});