/**
 * nzbGetAPI - Base API Class
 */
 window.ngAPI = {
 	groupTimer: null
 	,statusTimer: null
 	,groups: {}
 	,connectionStatus: true
 	,isInitialized: false
    ,appVersion: 0
    ,appName: ''
    ,activeNotifications: {}
	/**
	 * Setup version information
	 */
	,version: function(success_func, fail_func, tmpOptions) {
		return this.sendMessage('version', {}, success_func, fail_func, tmpOptions);
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
	 * Build a URL-object from options
	 *
	 * @var boolean authenticate
	 * @var [object] alt_options
	 * @var [string] path_add path to append
	 */
	,buildServerURI: function(authenticate, alt_options, path_add) {
		var opt = alt_options && alt_options.get ? alt_options : window.ngAPI.Options;
		var x = new URL('');

		var keys = [
			'protocol', 'port'
			,'pathname', 'host'];

		if(authenticate) {
			keys.push('username');
			keys.push('password');
		}

		for(var i in keys) {
			x[keys[i]] = opt.get('opt_' + keys[i]);
		}

		// Ensure pathname always does not end with a slash
		x.pathname = x.pathname.replace(/\/$/,'') + (path_add ? path_add : '');

		return x.href;
	}

	/**
	 * Send XHR Request to NZBGet via JSON-RPC
	 *
	 * @var method "method" to call
	 * @var params array of parameters to send
	 * @var success_func function to execute on success.
	 * @var fail_func function to execute on failure
     * @var alt_options use connection options from provided object
	 */
	,sendMessage: function(method, params, success_func, fail_func, alt_options) {
		var opt = typeof alt_options === 'object' ? alt_options : this.Options;
		var username = opt.get('opt_username')
		,password = opt.get('opt_password')
		,query = {
			version: '1.1'
			,method: method
			,params: params
		};

		var xhr = new XMLHttpRequest();
		xhr.timeout = 5000;
		xhr.ontimeout = function(){
			this.setSuccess(false);
			if(typeof fail_func === 'function'){
				fail_func('Timed out after 5 secs.');
			}
		}.bind(this);

		xhr.onreadystatechange = function(r){
			if (xhr.readyState == 4) {
				if(xhr.status == 200) {
					if(typeof alt_options !== 'object')
                        this.setSuccess(true);
					if(typeof success_func === 'function') {
						success_func(r.target.responseText ? JSON.parse(r.target.responseText) : '');
					}
				} else {
                    if(typeof alt_options !== 'object')
                        this.setSuccess(false);
					if(typeof fail_func === 'function'){
						fail_func(r.target.statusText ? r.target.statusText : '');
					}
				}
			}
		}.bind(this);

		xhr.open('POST', window.ngAPI.buildServerURI(false, opt, '/jsonrpc'));

		xhr.setRequestHeader('Content-Type','text/json');
		xhr.setRequestHeader('Authorization','Basic '+ window.btoa(username + ':' + password)); // Use Authorization header instead of passing user/pass. Otherwise request fails on larger nzb-files!?
		try {
			xhr.send(JSON.stringify(query));
		}
		catch (e){
            if(typeof alt_options !== 'object')
                this.setSuccess(false);
            if(typeof fail_func === 'function'){
                fail_func(e.name ? e.name : '');
            }
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
	,addURL: function(url, tab, ident, category, name_override) {
		var nzbFileName = url.match(/\/([^\/]+)$/)[1];
		var xhr = new XMLHttpRequest();

        if(!category) category = '';
		xhr.onreadystatechange = function(){
			if (xhr.readyState == 4) {
				if(xhr.status == 200) {
					if(xhr.getResponseHeader('Content-Type').indexOf("application/x-nzb") > -1)  {
                        if(xhr.getResponseHeader('X-DNZB-Category'))
                            category = xhr.getResponseHeader('X-DNZB-Category');

						/* Replace NZB file name with the one specified in response header if available. */
						var disposition = xhr.getResponseHeader('Content-Disposition');
						if(disposition) {
							rawName = disposition.replace(/.+filename=["]?([^";]+).*$/i, '$1');
							if(rawName) {
								// Remove potential path from filenameand strip
								// .nzb-extension if present
								nzbFileName = rawName.replace(/(.+[\/\\]{1})?(.+?)(\.nzb)?$/i, "$2");
							}
						}
						window.ngAPI.sendMessage('append', [(name_override ? name_override : nzbFileName + ".nzb"), category, 0, false, window.btoa(xhr.responseText)],
							function() {
								window.ngAPI.updateGroups();
								if(tab) {
									chrome.tabs.sendMessage(
										tab
										,{message: 'addedurl', url: url, status: true, id: ident}
									);
                                    window.ngAPI.cacheDb.addURLObj(url);
								}

							},
							function() {
								window.ngAPI.notify({
                                    title: 'Error'
                                    ,message: 'Could not download link.'
                                    ,iconUrl: 'img/error80.png'
                                    ,contextMessage: url
                                    }, url, tab
								);
								if(tab) {
									chrome.tabs.sendMessage(
										tab
										,{message: 'addedurl', url: url, status: false, id: ident}
									);
								}
							}
						);
					} else {
						window.ngAPI.notify({
                            title: 'Error'
                            ,message: 'Received invalid NZB-file.'
                            ,iconUrl: 'img/error80.png'
                            ,contextMessage: url
                        });
					}
				} else {
					window.ngAPI.notify({
                            title: 'Error'
                            ,message: 'Download failed.'
                            ,contextMessage: url
                        }, url, tab
					);

				}
			}
		}.bind(this);
		xhr.open('GET', url);
		xhr.send();
	}

	/**
	 * Download a file and try to send it to NZBGet
	 *
	 * @var info chrome OnClickData-object
	 * @var tab chrome tabs.Tab-object
	 */
	,addLink: function(info, tab) {
		window.ngAPI.addURL(info.linkUrl, tab);
	}
	/**
	 * Locate existing NZBGet-tab or open a new one
	 */
	,switchToNzbGetTab: function() {
		chrome.tabs.query({url: window.ngAPI.buildServerURI(false, null, '/*')}, function(tabs) {
			if(tabs.length) {
				chrome.tabs.update(tabs[0].id, {selected: true});
			} else {
				chrome.tabs.create({url: window.ngAPI.buildServerURI(true)});
			}
		});
	}
	/**
	 * Display notification for 5 sec
	 *
	 * @var opt    Notification option object
	 * @var url    Optional URL for retry purposes
     * @var tab    Optional tab id for addURL
	 */
	,notify: function(opt, url, tab) {
        if(ngAPI.Options.get('opt_notifications') === false
            || typeof opt !== 'object'
            || !chrome.notifications) return;

        if(typeof opt.iconUrl === 'undefined') opt.iconUrl= 'img/square80.png';
        if(!opt.type) opt.type = 'basic';
        if(url && !opt.buttons) opt.buttons = [
                {title: 'Try again', iconUrl: 'img/refresh24.png'}
        ];

        chrome.notifications.create('', opt, function(nId){
            if(url) {

                window.ngAPI.activeNotifications[nId] = {
                    url: url
                    ,tab: tab
                };
            }
        });
	}
	/**
	 * Request new status information via NZBGET JSON-RPC.
	 */
	,updateStatus: function() {
		this.sendMessage('status', {}, function(j){
			this.status = j.result;
			chrome.runtime.sendMessage({statusUpdated: 'status'});
			if(this.status.Download2Paused == true || this.status.DownloadPaused == true) {
				chrome.browserAction.setBadgeBackgroundColor({color: '#f09229'});
			} else {
				chrome.browserAction.setBadgeBackgroundColor({color: '#468847'});
			}
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
    * Tries to show appropriate notification based on status in history.
    */
    ,notifyDownloadStatus: function(post) {
        ngAPI.history(function(r) {
            for(var i in r.result) {
                if(r.result[i].NZBID == post.NZBID) {
                    var status =
                        window.ngAPI.parse.historyStatus(r.result[i]);

                    var nob = {
                        title: 'Download complete!'
                        ,message: post.NZBName
                        ,iconUrl: 'img/square80.png'
                    };

                    switch(status[0]) {
                        case 'success':
                            break;
                        case 'warning':
                            nob.title = 'Download finished with warnings!';
                            break;
                        case 'deleted':
                            if(status[1] && status[1] == 'manual') return;
                            if(status[1] && status[1] == 'dupe') {
                                nob.title = 'Duplicate download removed';
                                nob.iconUrl = 'img/error80.png';
                            }
                            break;
                        default:
                            nob.title = 'Download failed!';
                            nob.contextMessage = status[1] ? 'Reason: '+status[1]:'';
                            nob.iconUrl = 'img/error80.png';
                    }
                    window.ngAPI.notify(nob);

                    break;
                }
            }
        });
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
                    window.ngAPI.notifyDownloadStatus(this.groups[i]);
					delete this.groups[i];
					chrome.runtime.sendMessage({statusUpdated: 'history'});
				}
			}
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
		if(this.statusTimer) clearInterval(this.statusTimer);
		if(ngAPI.Options.get('opt_host').length === 0) {
			return this.isInitialized = false;
		}

		chrome.browserAction.setBadgeText({text: ''});

        var manifest = chrome.runtime.getManifest();
        this.appName = manifest.name;
        this.appVersion = manifest.version;

        chrome.browserAction.setTitle({title: this.appName + ' v' + this.appVersion});

		this.status = {
             DownloadRate: 0
            ,RemainingSizeMB: 0
            ,RemainingSizeLo: 0
            ,Download2Paused: false
            ,DownloadPaused: false
        };
		this.updateGroups();
		this.updateStatus();
		this.loadMenu();

		this.groupTimer = setInterval(this.updateGroups.bind(this), 5000);
		this.statusTimer = setInterval(this.updateStatus.bind(this), 5000);

        ngAPI.cacheDb.open();

		return this.isInitialized = true;
	}
    /**
    * IndexedDB abstraction storing info from URLS to recognize previously
    * added values
    */
    ,cacheDb: {
        dbRes: null
        ,aEl: document.createElement('a')
        ,open: function() {
            if(!'indexedDB' in window) return;
            var req = indexedDB.open('nzbgc_cache',1);
            var cdb = this;
            req.onsuccess = function(e) {
                cdb.dbRes = this.result;
            };
            req.onerror = function (e) {
                console.error("openDb:", e.target.errorCode);
            };
            req.onupgradeneeded = function(e) {
                var thisDB = e.currentTarget.result;

                if(!thisDB.objectStoreNames.contains('urls')) {
                    var store = thisDB.createObjectStore('urls', {
                        autoIncrement: true
                    });
                    store.createIndex('main', ['domain','id'], {unique:true});
                }
            };
        }
        ,addURLObj: function(url){
            if(!window.ngAPI.Options.get('opt_rememberurls'))
                return;
            var  store = this.getObjectStore('urls', 'readwrite')
                ,obj = this.objFromURL(url);
            obj.time_added = new Date().valueOf();
            req = store.add(obj);
            req.onerror = function() {
                console.error("addPublication error", this.error);
            };
        }
        ,checkURLObj: function(url, callback) {
            if(!window.ngAPI.Options.get('opt_rememberurls'))
                return;
            var  store = this.getObjectStore('urls', 'readonly')
                ,index = store.index('main')
                ,obj = this.objFromURL(url)
                ,request = index.get(IDBKeyRange.only([obj.domain, obj.id]));

            request.onsuccess = function(e) {
                var result = e.target.result;
                if(typeof callback != 'undefined') {
                    callback(typeof result != 'undefined');
                }
            }
        }
        ,getObjectStore: function(store_name, mode) {
            var tx = this.dbRes.transaction(store_name, mode);
            return tx.objectStore(store_name);
        }
        ,objFromURL: function(url) {
            // Workaround for broken searchstrings
            var atPos = url.indexOf('&');
            if(url.indexOf('?') == -1 && atPos > -1) {
                url = url.substring(0,atPos)+'?'+url.substring(atPos+1);
            }
            // Use A-element instead of URL() because A can handle relative URLs
            this.aEl.href = url;
            var osObj = {
                domain: this.aEl.host
                ,id: this.aEl.pathname + this.aEl.search
            };

            // Try to shorten URL based on a simple regex pattern
            var match = this.aEl.pathname.match(/\/[0-9a-z_]+\/([0-9a-z]+)/);
            if(match)
                osObj.id = match[1];
            return osObj;
        }

    }
	/**
	 * Option abstraction object. Handles everyting option related.
	 */
	,Options: {
		defaults: {
			opt_port: 6789
			,opt_username: 'nzbget'
			,opt_password: 'tegbzn6789'
			,opt_pathname: '/'
			,opt_downloaditems: 30
			,opt_historyitems: 30
			,opt_protocol: 'http'
            ,opt_rememberurls: false
            ,opt_notifications: true
		}
		,load: function() {
			Array.each($$('input[type=text],input[type=password],select'), function(o){
				o.value = this.get(o.id);
			},this);
		}
		,save: function() {
			Array.each($$('input[type=text],input[type=password],select'), function(o){
				localStorage[o.id] = o.value;
			},this);
		}
		,get: function(opt) {
			switch(true) {
				case typeof localStorage[opt] != 'undefined':
                    if(['true', 'false'].indexOf(localStorage[opt]) > -1){
                        return localStorage[opt] === 'true';
                    }
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

function prepareNotifications() {
    if(!chrome.notifications)
        return; // No notification support

    chrome.notifications.onButtonClicked.addListener(function(nId, bId){
        var not = window.ngAPI.activeNotifications[nId];

        window.ngAPI.addURL(not.url, not.tab);
        chrome.notifications.clear(nId, function(wasCleared) {});

        delete window.ngAPI.activeNotifications[nId];
    });

    chrome.notifications.onClicked.addListener(function(nId) {
        window.ngAPI.switchToNzbGetTab();
        if(window.ngAPI.activeNotifications[nId])
            delete window.ngAPI.activeNotifications[nId];
    });

    chrome.notifications.onClosed.addListener(function(nId, byUser) {
        if(window.ngAPI.activeNotifications[nId])
            delete window.ngAPI.activeNotifications[nId];
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Chrome <35 compatibility
    if(!window.URL && window.webkitURL)
        window.URL = window.webkitURL;

	ngAPI.initialize();

    prepareNotifications();

	chrome.runtime.onMessage.addListener(function(m, sender, respCallback) {
		if(m.message === 'optionsUpdated') {
			ngAPI.initialize();
		} else if(m.message === 'addURL') {
			ngAPI.addURL(
                m.href
                ,sender.tab.id
                ,m.id
                ,m.category ? m.category : null
                ,m.name_override ? m.name_override : null
            );
		} else if(m.message === 'checkCachedURL') {
            ngAPI.cacheDb.checkURLObj(m.url, respCallback);
            return true;
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

	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
		if(chrome.runtime.lastError) {
			return;
		}
		if (changeInfo.status == 'loading') {
			if(['http:', 'https:'].indexOf(new URL(tab.url).protocol) > -1) {
				chrome.tabs.executeScript(tabId, {
					code: "({isSpotweb: document.querySelector('meta[name=generator][content*=SpotWeb]') != null, isNewznab: document.querySelector('div.icon_nzb a[href*=\"/getnzb\"]') != null});"
				}, function(r) {
					if(r && typeof r[0] == 'object') {
						chrome.tabs.executeScript(tabId, {file: 'sites/common.js'});
						chrome.tabs.insertCSS(tabId, {file: 'sites/common.css'});
						if(r[0].isNewznab) {
							chrome.tabs.executeScript(tabId, {file: 'sites/newsnab.js'});
						}
						else if(r[0].isSpotweb) {
							chrome.tabs.executeScript(tabId, {file: 'sites/spotweb.js'});
							chrome.tabs.insertCSS(tabId, {file: 'sites/spotweb.css'});
						}
					}
				});
			}
		}
	});
});
