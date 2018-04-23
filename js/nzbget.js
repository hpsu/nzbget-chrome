/**
 * nzbGetAPI - Base API Class
 */
(function(){
    'use strict';
    window.ngAPI = {
        groupTimer: null,
        statusTimer: null,
        groups: {},
        connectionStatus: true,
        isInitialized: false,
        appVersion: 0,
        appName: '',
        activeNotifications: {},
        /**
         * Setup version information
         *
         * @param  {function} successFunc Callback function on success
         * @param  {function} failFunc    Callback function on failure
         * @param  {object}   tmpOptions  Temporary option object
         * @return {void}
         */
        version: function(successFunc, failFunc, tmpOptions) {
            return this.sendMessage(
                'version', {}, successFunc, failFunc, tmpOptions);
        },
        /**
         * Set group category
         *
         * @param  {int}      groupId      ID
         * @param  {string}   categoryName Name of new category
         * @param  {function} successFunc  Callback function on success
         * @param  {function} failFunc     Callback function on failure
         * @return {void}
         */
        setGroupCategory: function(groupId, categoryName,
                                   successFunc, failFunc) {
            if(!successFunc) {
                successFunc = ngAPI.updateGroups;
            }
            return ngAPI.sendMessage(
                'editqueue', [
                    'GroupApplyCategory',
                    0,
                    categoryName,
                    [groupId]
                ], successFunc, failFunc);
        },
        /**
         * Set group name
         *
         * @param  {int}      groupId      ID
         * @param  {string}   groupName    New name
         * @param  {function} successFunc  Callback function on success
         * @param  {function} failFunc     Callback function on failure
         * @return {void}
         */
        setGroupName: function(groupId, groupName,
                               successFunc, failFunc) {
            if(!successFunc) {
                successFunc = ngAPI.updateGroups;
            }
            return ngAPI.sendMessage(
                'editqueue', [
                    'GroupSetName',
                    0,
                    groupName,
                    [groupId]
                ], successFunc, failFunc);
        },
        updateCategories: function() {
            ngAPI.sendMessage('config', {}, this.parseCategories.bind(this));
        },
        parseCategories: function(data) {
            var result = data.result,
                categories = [];

            if(!result || !result.length) {
                return false;
            }

            for(var i in result) {
                var match = result[i].Name.match('Category([0-9]+)\.Name');
                if(match) {
                    categories.push(result[i].Value);
                }
            }
            this.Options.set('opt_categories', JSON.stringify(categories));
        },
        /**
         * Request history from JSON-RPC
         *
         * @param  {function} successFunc Callback function on success
         * @return {void}
         */
        history: function(successFunc) {
            return this.sendMessage('history', {}, successFunc);
        },
        /**
         * Setup context menu item(s)
         *
         * @return {void}
         */
        loadMenu: function(){
            chrome.contextMenus.removeAll();

            chrome.contextMenus.create({
                contexts: ['link'],
                id: 'root',
                title: 'Send to NZBGet',
                onclick: window.ngAPI.addLink.bind(this)
            });

            var categories = JSON.parse(this.Options.get('opt_categories'));
            if(categories && categories.length) {
                chrome.contextMenus.create({
                    contexts: ['link'],
                    parentId: 'root',
                    title: 'No category',
                    id: 'cat:',
                    onclick: window.ngAPI.addLink.bind(this)
                });
                chrome.contextMenus.create({
                    contexts: ['link'],
                    parentId: 'root',
                    type: 'separator'
                });
                for(var i in categories) {
                    chrome.contextMenus.create({
                        contexts: ['link'],
                        parentId: 'root',
                        title: categories[i],
                        id: 'cat:' + i,
                        onclick: window.ngAPI.addLink.bind(this)
                    });
                }
            }
        },
        /**
         * Build a URL-object from options
         *
         * @param  {object}  altOptions   Optional alternate options
         * @param  {string}  pathAdd      Path to append
         * @return {void}
         */
        buildServerURI: function(altOptions, pathAdd) {
            var opt = altOptions && altOptions.get ?
                      altOptions :
                      window.ngAPI.Options;
            var x = new URL('http://localhost');

            var keys = [
                'protocol',
                'port',
                'pathname',
                'host'];

            for(var i in keys) {
                x[keys[i]] = opt.get('opt_' + keys[i]);
            }

            // Ensure pathname always does not end with a slash
            x.pathname = x.pathname.replace(/\/$/, '') +
                         (pathAdd ? pathAdd : '');

            return x.href;
        },

        /**
         * Send XHR Request to NZBGet via JSON-RPC
         *
         * @param  {string}   method "method" to call
         * @param  {array}    params parameters to send
         * @param  {function} successFunc function to execute on success.
         * @param  {function} failFunc function to execute on failure
         * @param  {object}   altOptions use connection options
         *                    from provided object
         * @return {void}
         */
        sendMessage: function(method, params, successFunc,
                              failFunc, altOptions) {
            var opt = typeof altOptions === 'object' ?
                      altOptions :
                      this.Options;
            var username = opt.get('opt_username'),
                password = opt.get('opt_password'),
                query = {
                    version: '1.1',
                    method: method,
                    params: params
                };

            var xhr = new XMLHttpRequest();
            xhr.timeout = 5000;
            xhr.ontimeout = function(){
                this.setSuccess(false);
                if(typeof failFunc === 'function'){
                    failFunc('Timed out after 5 secs.');
                }
            }.bind(this);

            xhr.onreadystatechange = function(r){
                if (xhr.readyState === 4) {
                    if(xhr.status === 200) {
                        if(typeof altOptions !== 'object') {
                            this.setSuccess(true);
                        }
                        if(typeof successFunc === 'function') {
                            successFunc(
                                r.target.responseText ?
                                JSON.parse(r.target.responseText) :
                                '');
                        }
                    } else {
                        if(typeof altOptions !== 'object') {
                            this.setSuccess(false);
                        }
                        if(typeof failFunc === 'function'){
                            failFunc(
                                r.target.statusText ? r.target.statusText : '');
                        }
                    }
                }
            }.bind(this);

            xhr.open(
                'POST',
                window.ngAPI.buildServerURI(opt, '/jsonrpc'));

            xhr.setRequestHeader('Content-Type', 'text/json');
            xhr.setRequestHeader(
                 // Use Authorization header instead of passing user/pass.
                 // Otherwise request fails on larger nzb-files!?
                'Authorization',
                'Basic ' + window.btoa(username + ':' + password));
            try {
                xhr.send(JSON.stringify(query));
            }
            catch (e){
                if(typeof altOptions !== 'object') {
                    this.setSuccess(false);
                }
                if(typeof failFunc === 'function'){
                    failFunc(e.name ? e.name : '');
                }
            }

            if(!successFunc) {
                return JSON.parse(xhr.responseText);
            }
        },
        setSuccess: function(boo) {
            if(boo) {
                this.connectionStatus = true;
            }
            else {
                chrome.browserAction.setBadgeBackgroundColor(
                    {color: '#ff0000'});
                chrome.browserAction.setBadgeText(
                    {text: 'ERR'});
                this.connectionStatus = false;
            }
        },
        addURL: function(url, tab, ident, category, nameOverride) {
            var nzbFileName = url.match(/\/([^\/]+)$/)[1];
            var xhr = new XMLHttpRequest();

            if(!category) {
                category = '';
            }
            xhr.onreadystatechange = function(){
                if(xhr.readyState !== 4) {
                    return;
                }
                if(xhr.status === 200) {
                    if(xhr.getResponseHeader('Content-Type')
                       .indexOf('application/x-nzb') > -1) {
                        if(xhr.getResponseHeader('X-DNZB-Category')) {
                            category = xhr.getResponseHeader(
                                'X-DNZB-Category');
                        }

                        /* Replace NZB file name with the one specified in
                           response header if available. */
                        var disposition = xhr.getResponseHeader(
                            'Content-Disposition');
                        if(disposition) {
                            var rawName = disposition.replace(
                                /.+filename=["]?([^";]+).*$/i,
                                '$1');
                            if(rawName) {
                                // Remove potential path from filename and
                                // strip .nzb-extension if present
                                nzbFileName = rawName.replace(
                                    /(.+[\/\\]{1})?(.+?)(\.nzb)?$/i,
                                    '$2');
                            }
                        }
                        window.ngAPI.sendMessage(
                            'append',
                            [
                                nameOverride ?
                                    nameOverride :
                                    nzbFileName + '.nzb',
                                category,
                                0,
                                false,
                                window.btoa(xhr.responseText)
                            ],
                            function() {
                                window.ngAPI.updateGroups();
                                if(!tab) {
                                    return;
                                }
                                if(ident) {
                                    chrome.tabs.sendMessage(
                                        tab, {
                                            message: 'addedurl',
                                            url: url,
                                            status: true,
                                            id: ident
                                        }
                                    );
                                }
                                window.ngAPI.cacheDb.addURLObj(url);
                            },
                            function() {
                                window.ngAPI.notify({
                                    title: 'Error',
                                    message: 'Could not download link.',
                                    iconUrl: 'img/error80.png',
                                    contextMessage: url
                                }, url, tab);
                                if(!tab) {
                                    return;
                                }
                                if(ident) {
                                    chrome.tabs.sendMessage(
                                        tab,
                                        {
                                            message: 'addedurl',
                                            url: url,
                                            status: false,
                                            id: ident
                                        }
                                    );
                                }
                            }
                        );
                    } else {
                        window.ngAPI.notify({
                            title: 'Error',
                            message: 'Received invalid NZB-file.',
                            iconUrl: 'img/error80.png',
                            contextMessage: url
                        });
                    }
                } else {
                    window.ngAPI.notify({
                        title: 'Error',
                        message: 'Download failed.',
                        contextMessage: url
                    },
                    url,
                    tab
                    );
                    if(tab && ident) {
                        chrome.tabs.sendMessage(
                            tab,
                            {
                                message: 'addedurl',
                                url: url,
                                status: false,
                                id: ident
                            }
                        );
                    }
                }
            };
            xhr.open('GET', url);
            xhr.send();
        },

        /**
         * Download a file and try to send it to NZBGet
         *
         * @param  {object} info chrome OnClickData-object
         * @param  {object} tab chrome tabs.Tab-object
         * @return {void}
         */
        addLink: function(info, tab) {
            var category = '';
            if(info.menuItemId && info.menuItemId !== 'root') {
                var id = info.menuItemId.split(':'),
                    categories = JSON.parse(
                        this.Options.get('opt_categories'));
                if(id[1]) {
                    category = categories[id[1]];
                }
            }
            this.addURL(info.linkUrl, tab, null, category);
        },
        /**
         * Locate existing NZBGet-tab or open a new one
         * @return {void}
         */
        switchToNzbGetTab: function() {
            chrome.tabs.query({
                url: window.ngAPI.buildServerURI(null, '/*')
            }, function(tabs) {
                if(tabs.length) {
                    chrome.tabs.update(tabs[0].id, {selected: true});
                } else {
                    chrome.tabs.create(
                        {url: window.ngAPI.buildServerURI()});
                }
            });
        },
        /**
         * Display notification for 5 sec
         *
         * @param  {object}  opt Notification option object
         * @param  {string}  url Optional URL for retry purposes
         * @param  {integer} tab Optional tab id for addURL
         * @return {void}
         */
        notify: function(opt, url, tab) {
            if(window.ngAPI.Options.get('opt_notifications') === false ||
                    typeof opt !== 'object' || !chrome.notifications) {
                return;
            }

            if(typeof opt.iconUrl === 'undefined') {
                opt.iconUrl = 'img/square80.png';
            }
            if(!opt.type) {
                opt.type = 'basic';
            }
            if(url && !opt.buttons) {
                opt.buttons = [
                    {title: 'Try again', iconUrl: 'img/refresh24.png'}
                ];
            }

            chrome.notifications.create('', opt, function(nId){
                if(url) {
                    window.ngAPI.activeNotifications[nId] = {
                        url: url,
                        tab: tab
                    };
                }
            });
        },
        /**
         * Request new status information via NZBGET JSON-RPC.
         *
         * @return {void}
         */
        updateStatus: function() {
            this.sendMessage('status', {}, function(j){
                this.status = j.result;
                chrome.runtime.sendMessage({statusUpdated: 'status'});
                if(this.status.Download2Paused === true ||
                   this.status.DownloadPaused === true) {
                    chrome.browserAction.setBadgeBackgroundColor({
                        color: '#f09229'});
                } else {
                    chrome.browserAction.setBadgeBackgroundColor({
                        color: '#468847'});
                }
            }.bind(this));
        },
        /**
        * Tries to show appropriate notification based on status in history.
        *
        * @param  {object} post NZBGet group object
        * @return {void}
        */
        notifyDownloadStatus: function(post) {
            window.ngAPI.history(function(r) {
                for(var i in r.result) {
                    if(r.result[i].NZBID === post.NZBID) {
                        var status =
                            window.ngAPI.parse.historyStatus(r.result[i]);

                        var nob = {
                            title: 'Download complete!',
                            message: post.NZBName,
                            iconUrl: 'img/square80.png'
                        };

                        switch(status[0]) {
                            case 'success':
                                break;
                            case 'warning':
                                nob.title = 'Download finished with warnings!';
                                break;
                            case 'deleted':
                                if(status[1] && status[1] === 'manual') {
                                    return;
                                }
                                if(status[1] && status[1] === 'dupe') {
                                    nob.title = 'Duplicate download removed';
                                    nob.iconUrl = 'img/error80.png';
                                }
                                break;
                            default:
                                nob.title = 'Download failed!';
                                nob.contextMessage = status[1] ?
                                                     'Reason: ' + status[1] :
                                                     '';
                                nob.iconUrl = 'img/error80.png';
                        }
                        window.ngAPI.notify(nob);
                        break;
                    }
                }
            });
        },
        /**
         * Request new group information via NZBGET JSON-RPC.
         *
         * Notifies on complete downloads
         * Updates badge on active downloads.
         *
         * @return {void}
         */
        updateGroups: function() {
            ngAPI.sendMessage('listgroups', [], function(j) {
                var newIDs = [];
                for(var i in j.result) {
                    var id = j.result[i].NZBID;
                    newIDs[id] = true;
                    if(ngAPI.groups[id]) {
                        for(var attr in j.result[i]) {
                            ngAPI.groups[id][attr] = j.result[i][attr];
                        }
                    }
                    else {
                        ngAPI.groups[id] = j.result[i];
                    }
                    ngAPI.groups[id].sortorder = i;
                }
                if(ngAPI.groups) {
                    for(i in ngAPI.groups) {
                        if(!newIDs[i]) {
                            window.ngAPI.notifyDownloadStatus(ngAPI.groups[i]);
                            delete ngAPI.groups[i];
                            chrome.runtime.sendMessage(
                                {statusUpdated: 'history'});
                        }
                    }
                }
                chrome.browserAction.setBadgeText({
                    text: j.result.length ?
                    j.result.length.toString() :
                    ''});
                chrome.runtime.sendMessage({statusUpdated: 'groups'});
            });
        },
        /**
         * Setup polling timers and stuff
         *
         * @return {bool} success
         */
        initialize: function(){
            if(this.groupTimer) {
                clearInterval(this.groupTimer);
            }
            if(this.statusTimer) {
                clearInterval(this.statusTimer);
            }
            if(window.ngAPI.Options.get('opt_host').length === 0) {
                this.isInitialized = false;
                return;
            }

            chrome.browserAction.setBadgeText({text: ''});

            var manifest = chrome.runtime.getManifest();
            this.appName = manifest.name;
            this.appVersion = manifest.version;

            chrome.browserAction.setTitle({
                title: this.appName + ' v' + this.appVersion});

            this.status = {
                DownloadRate: 0,
                RemainingSizeMB: 0,
                RemainingSizeLo: 0,
                Download2Paused: false,
                DownloadPaused: false
            };
            this.updateCategories();
            this.updateGroups();
            this.updateStatus();
            this.loadMenu();

            this.groupTimer = setInterval(this.updateGroups.bind(this), 5000);
            this.statusTimer = setInterval(this.updateStatus.bind(this), 5000);

            window.ngAPI.cacheDb.open();

            this.isInitialized = true;
            return;
        },
        /**
        * IndexedDB abstraction storing info from URLS to recognize previously
        * added values
        */
        cacheDb: {
            dbRes: null,
            aEl: document.createElement('a'),
            open: function() {
                if(!('indexedDB' in window)) {
                    return;
                }
                var req = indexedDB.open('nzbgc_cache', 1);
                var cdb = this;
                req.onsuccess = function() {
                    cdb.dbRes = this.result;
                };
                req.onerror = function () {
                };
                req.onupgradeneeded = function(e) {
                    var thisDB = e.currentTarget.result;

                    if(!thisDB.objectStoreNames.contains('urls')) {
                        var store = thisDB.createObjectStore('urls', {
                            autoIncrement: true
                        });
                        store.createIndex(
                            'main',
                            ['domain', 'id'],
                            {unique: true});
                    }
                };
            },
            addURLObj: function(url){
                if(!window.ngAPI.Options.get('opt_rememberurls')) {
                    return;
                }
                var store = this.getObjectStore('urls', 'readwrite'),
                    obj = this.objFromURL(url);
                obj.time_added = new Date().valueOf();
                var req = store.add(obj);
                req.onerror = function() {
                };
            },
            checkURLObj: function(url, callback) {
                if(!window.ngAPI.Options.get('opt_rememberurls')) {
                    return;
                }
                var store = this.getObjectStore('urls', 'readonly'),
                    index = store.index('main'),
                    obj = this.objFromURL(url),
                    request = index.get(IDBKeyRange.only([obj.domain, obj.id]));

                request.onsuccess = function(e) {
                    var result = e.target.result;
                    if(typeof callback !== 'undefined') {
                        callback(typeof result !== 'undefined');
                    }
                };
            },
            getObjectStore: function(storeName, mode) {
                var tx = this.dbRes.transaction(storeName, mode);
                return tx.objectStore(storeName);
            },
            objFromURL: function(url) {
                // Workaround for broken searchstrings
                var atPos = url.indexOf('&');
                if(url.indexOf('?') === -1 && atPos > -1) {
                    url = url.substring(0, atPos) +
                          '?' +
                          url.substring(atPos + 1);
                }
                /* Use A-element instead of URL() because A can handle
                   relative URLs */
                this.aEl.href = url;
                var osObj = {
                    domain: this.aEl.host,
                    id: this.aEl.pathname + this.aEl.search
                };

                // Try to shorten URL based on a simple regex pattern
                var match = this.aEl.pathname.match(
                    /\/[0-9a-z_]+\/([0-9a-z]+)/);
                if(match) {
                    osObj.id = match[1];
                }
                return osObj;
            }

        },
        /**
         * Option abstraction object. Handles everyting option related.
         */
        Options: {
            defaults: {
                opt_port: 6789,
                opt_username: 'nzbget',
                opt_password: 'tegbzn6789',
                opt_pathname: '/',
                opt_historyitems: 30,
                opt_protocol: 'http',
                opt_rememberurls: false,
                opt_notifications: true,
                opt_categories: '[]'
            },
            load: function() {
                Array.each(
                    document.querySelectorAll(
                        'input[type=text],input[type=password],select'),
                    function(o){
                        o.value = this.get(o.id);
                    }, this);
            },
            save: function() {
                Array.each(
                    document.querySelectorAll(
                        'input[type=text],input[type=password],select'),
                    function(o){
                        localStorage[o.id] = o.value;
                    }, this);
            },
            get: function(opt) {
                if(typeof localStorage[opt] !== 'undefined') {
                    if(['true', 'false'].indexOf(localStorage[opt]) > -1){
                        return localStorage[opt] === 'true';
                    }
                    return localStorage[opt];
                }
                else if(typeof this.defaults[opt] !== 'undefined') {
                    return this.defaults[opt];
                }
                return '';
            },
            set: function(opt, value) {
                localStorage[opt] = value;
            }
        }
    };
    /**
     * Setup notifications
     *
     * @return {void}
     */
    function prepareNotifications() {
        if(!chrome.notifications) {
            return; // No notification support
        }

        chrome.notifications.onButtonClicked.addListener(function(nId){
            var not = window.ngAPI.activeNotifications[nId];

            window.ngAPI.addURL(not.url, not.tab);
            chrome.notifications.clear(nId, function() {});

            delete window.ngAPI.activeNotifications[nId];
        });

        chrome.notifications.onClicked.addListener(function(nId) {
            window.ngAPI.switchToNzbGetTab();
            if(window.ngAPI.activeNotifications[nId]) {
                delete window.ngAPI.activeNotifications[nId];
            }
        });

        chrome.notifications.onClosed.addListener(function(nId) {
            if(window.ngAPI.activeNotifications[nId]) {
                delete window.ngAPI.activeNotifications[nId];
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function() {
        // Chrome <35 compatibility
        if(!window.URL && window.webkitURL) {
            window.URL = window.webkitURL;
        }

        window.ngAPI.initialize();

        prepareNotifications();

        chrome.runtime.onMessage.addListener(function(m, sender, respCallback) {
            if(m.message === 'optionsUpdated') {
                window.ngAPI.initialize();
            } else if(m.message === 'addURL') {
                window.ngAPI.addURL(
                    m.href,
                    sender.tab.id,
                    m.id,
                    m.category ? m.category : null,
                    m.nameOverride ? m.nameOverride : null
                );
            } else if(m.message === 'checkCachedURL') {
                window.ngAPI.cacheDb.checkURLObj(m.url, respCallback);
                return true;
            }
        });
        chrome.runtime.onConnect.addListener(function(port) {
            port.onDisconnect.addListener(function(){
                clearInterval(window.ngAPI.groupTimer);
                clearInterval(window.ngAPI.statusTimer);
                window.ngAPI.groupTimer = setInterval(
                    window.ngAPI.updateGroups.bind(window.ngAPI),
                    5000);
                window.ngAPI.statusTimer = setInterval(
                    window.ngAPI.updateStatus.bind(window.ngAPI),
                    5000);
            });
            clearInterval(window.ngAPI.groupTimer);
            clearInterval(window.ngAPI.statusTimer);
            window.ngAPI.groupTimer = setInterval(
                window.ngAPI.updateGroups.bind(window.ngAPI),
                500);
            window.ngAPI.statusTimer = setInterval(
                window.ngAPI.updateStatus.bind(window.ngAPI),
                500);
        });

        chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
            if(changeInfo.status === 'loading' &&
               ['http:', 'https:'].indexOf(new URL(tab.url).protocol) > -1) {
                chrome.tabs.executeScript(tabId, {
                    code: '({' +
                          '   isSpotweb: document.querySelector(' +
                          "     'meta[name=generator][content*=SpotWeb]')" +
                          '       != null,' +
                          '   isNewznab: document.querySelector(' +
                          "     'div.icon_nzb a[href*=\"/getnzb\"]')" +
                          '       != null,' +
                          '   isNzbGeek: window.location.hostname.includes("nzbgeek.info"),' +
                          '   isTtRSS: document.querySelector(' +
                          "     '#ttrssMain') != null," +
                          '   isFreshRSS: document.querySelector(' +
                          "     'meta[name=apple-mobile-web-app-title][" +
                          "           content=FreshRSS]') != null" +
                          '});'
                }, function(r) {
                    if(!chrome.runtime.lastError && r &&
                       typeof r[0] === 'object') {
                        chrome.tabs.executeScript(
                            tabId,
                            {file: 'sites/common.js'});
                        chrome.tabs.insertCSS(
                            tabId,
                            {file: 'sites/common.css'});
                        if(r[0].isNewznab) {
                            chrome.tabs.executeScript(
                                tabId,
                                {file: 'sites/newsnab.js'});
                        }
                        else if(r[0].isSpotweb) {
                            chrome.tabs.executeScript(
                                tabId,
                                {file: 'sites/spotweb.js'});
                            chrome.tabs.insertCSS(
                                tabId,
                                {file: 'sites/spotweb.css'});
                        }
                        else if(r[0].isTtRSS) {
                            chrome.tabs.executeScript(
                                tabId,
                                {file: 'sites/ttrss.js'});
                        }
                        else if(r[0].isFreshRSS) {
                            chrome.tabs.executeScript(
                                tabId,
                                {file: 'sites/freshrss.js'});
                        }
                    }
                });
            }
        });
    });
})();
