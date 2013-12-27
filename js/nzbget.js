/**
 * nzbGetAPI - Base API Class
 */
 window.ngAPI = {
 	groupTimer: null
 	,statusTimer: null
 	,groups: {}
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
		chrome.contextMenus.removeAll();

		chrome.contextMenus.create({
			contexts:['link'],
			id: '-1',
			title: 'Send to NZBGet',
			onclick: window.ngAPI.addLink
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
										this.close();
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
				} else {
					window.ngAPI.notify(
						'Download failed!'
						,"Request failed with status: "+xhr.status+"\nClick to try again.\n"+info.linkUrl
						,'img/broken-arrow.svg'
						,null
						,function() {
							window.ngAPI.addLink(info, tab);
							this.close();
						}
					);

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
			for(x in ngAPI.groups) {
				if(post.NZBID == x) {
					ngAPI.groups[x].post = post;
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
			var newIDs = [];
			for(i in j.result) {
				var id = j.result[i].NZBID;
				newIDs[id] = true;
				if(this.groups[id]) {
					for(attr in j.result[i]) {
						this.groups[id][attr] = j.result[i][attr];
					}
				}
				else {
					this.groups[id] = j.result[i];
				}
				this.groups[id].sortorder = i;
			}
			if(j.result.length) ngAPI.sendMessage('postqueue', [], ngAPI.updatePostQueue);

			if(this.groups) for(i in this.groups) {
				if(!newIDs[i]) {
					window.ngAPI.notify('Download complete!', this.groups[i].NZBName);
					delete this.groups[i];
					chrome.runtime.sendMessage({statusUpdated: 'history'});
				}
			}
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
		defaults: {
			opt_port: 6789
			,opt_username: 'nzbget'
			,opt_password: 'tegbzn6789'
			,opt_historyitems: 30
		}
		,load: function() {
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
			switch(true) {
				case typeof localStorage[opt] != 'undefined':
					return localStorage[opt];
				case typeof this.defaults[opt] != 'undefined':
					return this.defaults[opt];
				default:
					return '';
			}
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
	chrome.runtime.onConnect.addListener(function(port) {
		port.onDisconnect.addListener(function(){
			clearInterval(ngAPI.groupTimer);
			clearInterval(ngAPI.statusTimer);
			ngAPI.groupTimer = setInterval(ngAPI.updateGroups.bind(ngAPI), 5000);
			ngAPI.statusTimer = setInterval(ngAPI.updateStatus.bind(ngAPI), 5000);
		});
		clearInterval(ngAPI.groupTimer);
		clearInterval(ngAPI.statusTimer);
		ngAPI.groupTimer = setInterval(ngAPI.updateGroups.bind(ngAPI), 500);
		ngAPI.statusTimer = setInterval(ngAPI.updateStatus.bind(ngAPI), 500);
	});
});