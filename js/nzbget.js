/**
 * nzbGetAPI - Base API Class
 */
 window.ngAPI = {
 	groupTimer: null
 	,statusTime: null
 	,connectionStatus: true
 	,isInitialized: false
	/**
	 * Setup version information
	 */
	,version: function() {
		return this.sendMessage('version', {}, false);
	}
	/**
	 * Request history from JSON-RPC
	 */
	,history: function(async) {
		return this.sendMessage('history', {}, async);
	}
	/**
	 * Setup context menu item(s)
	 */
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
	/**
	 * Send XHR Request to NZBGet via JSON-RPC
	 *
	 * @var method "method" to call
	 * @var params array of parameters to send
	 * @var success_func function to execute on success. Turns async off if it evaluates to false.
	 * @var fail_func function to execute on failure
	 */
	,sendMessage: function(method, params, success_func, fail_func) {
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
					this.setSuccess(true);
					if(typeof success_func === 'function') {
						success_func(JSON.parse(r.target.responseText));
					}
				} else {
					this.setSuccess(false);
					if(typeof fail_func === 'function'){
						fail_func(JSON.parse(r.target.responseText));
					}
				}
			}
		}.bind(this);
		xhr.open('POST', 'http://' + url + ':' + port + '/jsonrpc', typeof succes_func === 'function');
		xhr.setRequestHeader('Content-Type','text/json');
		xhr.setRequestHeader('Authorization','Basic '+ window.btoa(username + ':' + password)); // Use Authorization header instead of passing user/pass. Otherwise request fails on larger nzb-files!?
		try {
			xhr.send(JSON.stringify(query));
		}
		catch (e){
			this.setSuccess(false);
		}

		if(!success_func) {
			return JSON.parse(xhr.responseText);
		}
	}
	,setSuccess: function(boo) {
		if(boo) {
			this.connectionStatus = true;
		}
		else {
			chrome.browserAction.setBadgeBackgroundColor({color: '#ff0000'});
			chrome.browserAction.setBadgeText({text: 'ERR'});
			this.connectionStatus = false;
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
								window.ngAPI.notify(
									'Error occured!'
									,"Could not download link. Click to try again\n"+info.linkUrl
									,'img/broken-arrow.svg'
									,null
									,function() {
										window.ngAPI.addLink(info, tab);
									}
								);
							}
						);
					} else {
						window.ngAPI.notify(
							'Not an NZB-file!?'
							,"Link does not appear to be valid.\n"+info.linkUrl
							,'img/broken-arrow.svg'
							,null
						);
					}
				}
			}
		}.bind(this);
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
	,notify: function(header, message, icon, timeout, onclick) {
		if(typeof timeout === 'undefined') timeout = 5000;
		if(typeof icon === 'undefined') icon = 'img/nzbget-icon.svg';
		if(typeof onclick === 'undefined') onclick = function() {
			window.ngAPI.switchToNzbGetTab();
		};
		var n = new Notification(header, {icon: icon, body: message});
		
		if(timeout !== null) {
			n.onshow = function(){
				setTimeout(function() {n.close();}, timeout);
			};
		}
		if(onclick !== null) {
			n.onclick = onclick;
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
	,updatePostQueue: function(j) {
		for(i in j.result) {
			var post = j.result[i];
			for(x in ngAPI.groups.result) {
				var group = ngAPI.groups.result[x];
				if(post.NZBID == group.NZBID) {
					group.post = post;
				}
			}
		}
	}
	/**
	 * Request new group information via NZBGET JSON-RPC.
	 * Notifies on complete downloads 
	 * Updates badge on active downloads.
	 */
	,updateGroups: function() {
		this.sendMessage('listgroups', [], (function(j){
			if(j.result.length) ngAPI.sendMessage('postqueue', [], ngAPI.updatePostQueue);
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
			chrome.browserAction.setBadgeBackgroundColor({color: '#468847'});
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
		}
	});
});