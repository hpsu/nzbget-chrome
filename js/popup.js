(function(){
    'use strict';
    var dragging = null,
        MAX32 = 4294967296,
        totalMBToDownload = 0;

    /**
     * bigNumber
     * Combines two 32-bit integers to a 64-bit Double
     * (may lose data with extreme sizes)
     *
     * @param  {integer} hi high-end int
     * @param  {integer} lo low-end int
     * @return {number}  Larger number
     */
    function bigNumber(hi, lo) {
        return Number(hi * MAX32 + lo);
    }

    /**
     * function index()
     * Get elements "position" in relation to it's siblings
     * @return {integer} Number in stack
     */
    Element.prototype.index = function() {
        if(!this.parentNode) {
            return -1;
        }
        return [].indexOf.call(this.parentNode.children, this);
    };

    /**
     * function toHRTimeDiff()
     * Compares Date object to current Date and outputs human readable time diff
     * @param  {Date}   inputDate Date object
     * @return {string} Human readable time diff
     */
    function toHRTimeDiff(inputDate) {
        var diff = ((new Date()).getTime() - inputDate.getTime()) / 1000,
            dayDiff = Math.floor(diff / 86400);

        if(isNaN(dayDiff) || dayDiff < 0) {
            return 0;
        }

        return dayDiff === 0 && (
                diff < 60 && 'just now' ||
                diff < 120 && '1 min ago' ||
                diff < 3600 && Math.floor(diff / 60) + ' mins ago' ||
                diff < 7200 && '1 hour ago' ||
                diff < 86400 && Math.floor(diff / 3600) + ' hours ago') ||
               dayDiff === 1 && 'Yesterday ' + inputDate.toLocaleTimeString() ||
               inputDate.toLocaleString();
    }

    /**
     * function zeroPad()
     * adds a zero before an integer if needed to make it a string
     * at least two characters wide
     *
     * @param  {integer} inputNumber number to pad
     * @return {string}  zero-padded input
     */
    function zeroPad(inputNumber) {
        return (Number(inputNumber) < 10 ? '0' : '') + String(inputNumber);
    }

    /**
     * function toHRTimeLeft()
     * Formats an integer of seconds to a human readable string
     *
     * @param  {integer} inputStamp timestamp
     * @return {string} Human readable time diff
     */
    function toHRTimeLeft(inputStamp) {
        var days = Math.floor(inputStamp / 86400);
        if(days > 10) {
            return days + 'd';
        }

        var hours = Math.floor(inputStamp % 86400 / 3600);
        if(days > 0) {
            return days + 'd ' + hours + 'h';
        }

        var minutes = Math.floor(inputStamp / 60 % 60);
        if (hours > 0) {
            return hours + 'h ' + zeroPad(minutes) + 'm';
        }

        var seconds = Math.floor(inputStamp % 60);
        if (minutes > 0) {
            return minutes + 'm ' + zeroPad(seconds) + 's';
        }

        return seconds + 's';
    }

    /**
     * function formatHRSize()
     * Formats an integer of seconds to a human readable string
     *
     * @param  {integer} bytes size in bytes
     * @return {string} Human readable representation of bytes
     */
    function toHRDataSize(bytes) {
        var sizes = {
                1: ['KiB', 0],
                2: ['MiB', 1],
                3: ['GiB', 2],
                4: ['TiB', 2]
            },
            output = null;
        Object.keys(sizes).reverse().forEach( function(i) {
            if(!output && this >= Math.pow(1024, i)) {
                var nmr = this / Math.pow(1024, i);
                output = nmr.toFixed(nmr < 100 ? sizes[i][1] : 0) +
                         ' ' + sizes[i][0];
            }
        }.bind(bytes));
        return output !== null ? output : bytes + 'B';
    }

    /**
     * function detectGroupStatus()
     * Returns a string representing current download status
     *
     * @param {object} group Group object
     * @return {string} Group status
     */
    function detectGroupStatus(group) {
        switch(true) {
            case typeof group.post !== 'undefined':
                return 'postprocess';
            case group.ActiveDownloads > 0:
                return 'downloading';
            case group.PausedSizeLo !== 0 &&
                 group.RemainingSizeLo === group.PausedSizeLo:
                return 'paused';
        }
        return 'queued';
    }

    /**
     * function setupDraggable()
     * Setup drag'n'drop on an element with all associated event handlers
     * also adds a placeholder element that gets moved around while dragging
     *
     * @param {Element} post element to drag
     * @return {void}
     */
    function setupDraggable(post) {
        post.setAttribute('draggable', true);
        post.placeholder = $E({tag: 'div', className: 'placeholder'});
        post.indexBefore = 0;

        var dover = function (ev) {
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'move';

            if(this.classList.contains('post')) {
                if(dragging.offsetHeight) {
                    dragging.storedHeight = dragging.offsetHeight;
                }
                if(dragging.storedHeight) {
                    this.placeholder.style.height = dragging.storedHeight +
                                                    'px';
                }
                dragging.style.display = 'none';
                var pholders = this.parentElement.querySelectorAll(
                    'div.placeholder');
                for(var i = 0; i < pholders.length; i++) {
                    if(pholders[i] !== this.placeholder) {
                        pholders[i].parentNode.removeChild(pholders[i]);
                    }
                }

                this.parentElement.insertBefore(
                    this.placeholder,
                    this.placeholder.index() < this.index() ?
                        this.nextSibling :
                        this);
            }
            return false;
        };
        var drop = function (ev) {
            ev.preventDefault();
            this.parentElement.insertBefore(
                dragging,
                this.parentElement.querySelector('.placeholder'));
            if(dragging.indexBefore !== dragging.index()) {
                dragging.dispatchEvent(new CustomEvent('sortupdate', {detail: {
                    oldIndex: dragging.indexBefore,
                    newIndex: dragging.index(),
                    nzbID: dragging.getAttribute('rel')
                }
                }));
            }
            dragging.dispatchEvent(new Event('dragend'));
            return false;
        };
        post.addEventListener('dragstart', function(e){
            dragging = this;
            dragging.indexBefore = this.index();
            var dt = e.dataTransfer;
            dt.effectAllowed = 'move';
            dt.setData('text/html', this.innerHTML);
        });
        post.addEventListener('dragend', function(){
            if (!dragging) {
                return;
            }
            dragging.style.display = 'flex';
            var pholders = document.querySelectorAll('div.placeholder');
            for(var i = 0; i < pholders.length; i++) {
                pholders[i].parentNode.removeChild(pholders[i]);
            }
            dragging = null;
        });

        post.addEventListener('dragover', dover);
        post.addEventListener('dragenter', dover);
        post.addEventListener('drop', drop);
        post.addEventListener('sortupdate', function(e){
            var oldI = e.detail.oldIndex,
                newI = e.detail.newIndex,
                diff = newI - oldI,
                fileId = window.ngAPI.groups[e.detail.nzbID].LastID;

            window.ngAPI.sendMessage(
                'editqueue', [
                    'GroupMoveOffset',
                    diff,
                    '',
                    [fileId]
                ], function() {
            });
        });

        post.placeholder.addEventListener('dragover', dover);
        post.placeholder.addEventListener('dragenter', dover);
        post.placeholder.addEventListener('drop', drop);

    }

    function setupContextMenu(e){
        e.stopPropagation();
        var ctxm = e.target.querySelector('div.contextmenu'),
            pse = null;
        if(ctxm) {
            if(getComputedStyle(ctxm).display === 'block') {
                ctxm.style.display = 'none';
            }
            else {
                ctxm.style.display = 'block';
            }

            pse = ctxm.querySelector('li.pause');
        }
        else {
            e.target.ctxm = e.target.parentNode.appendChild($E({
                tag: 'div',
                className: 'contextmenu'}));
            var ul = e.target.ctxm.appendChild($E({tag: 'ul'}));
            pse = ul.appendChild($E({
                tag: 'li',
                className: 'pause',
                text: 'Pause'}));
            var del = ul.appendChild($E({
                tag: 'li',
                className: 'delete',
                text: 'Delete'}));

            pse.addEventListener('click', function(clickEvent) {
                clickEvent.stopPropagation();
                this.style.display = 'none';
                var nid = this.parentNode.getAttribute('rel'),
                    fileId = window.ngAPI.groups[nid].LastID,
                    status = window.ngAPI.groups[nid].status,
                    method = status === 'paused' ?
                            'GroupResume' :
                            'GroupPause';

                window.ngAPI.sendMessage(
                    'editqueue',
                    [method, 0, '', [fileId]],
                    function() {});
            }.bind(e.target.ctxm));

            del.addEventListener('click', function(clickEvent){
                clickEvent.stopPropagation();
                this.style.display = 'none';
                var nid = this.parentNode.parentNode.getAttribute('rel'),
                    fileId = window.ngAPI.groups[nid].LastID;
                if(confirm('Are you sure?')) {
                    window.ngAPI.sendMessage(
                        'editqueue',
                        ['GroupDelete', 0, '', [fileId]],
                        function() {});
                }
            }.bind(e.target.ctxm));
            ctxm = e.target.ctxm;
        }
        pse.innerText = window.ngAPI.groups[
            ctxm.parentNode.getAttribute('rel')
        ].status === 'paused' ? 'Resume' : 'Pause';
    }

    /**
     * Health warning badge
     *
     * @param  {object}  item NZBGet item
     * @param  {Element} post inject element
     * @return {void}
     */
    function hwBadge(item, post) {
        if(item.Health < 1000 && (!item.postprocess ||
                                  item.status === 'pp-queued' &&
                                  item.post.TotalTimeSec === 0)) {
            var hwContainer = post.querySelector('span.health-warning'),
                hwClass = 'health-warning' + (
                    item.Health < item.CriticalHealth ? ' critical' : ''),
                hwLbl = 'health: ' + Math.floor(item.Health / 10) + '%';

            if(hwContainer) {
                hwContainer.className = hwClass;
                hwContainer.innerText = hwLbl;
            } else {
                var h = $E({
                    tag: 'span',
                    className: hwClass,
                    text: hwLbl});
                post.querySelector('.title').appendChild(h);
            }
        }
    }

    /**
     * Add or update a download entry
     *
     * @param {object} item Download item
     * @return {void}
     */
    function downloadPost(item) {
        var totalMB = item.FileSizeMB - item.PausedSizeMB,
            remainingMB = item.RemainingSizeMB - item.PausedSizeMB,
            percent = Math.round((totalMB - remainingMB) / totalMB * 100),
            estRem = window.ngAPI.status.DownloadRate ? toHRTimeLeft(
                        (totalMBToDownload + remainingMB) * 1024 /
                        (window.ngAPI.status.DownloadRate / 1024)) :
                     '',
            post = document.querySelector(
                '#download_container [rel="' + item.NZBID + '"]'),
            update = post !== null,
            leftLabel = item.post ? item.post.ProgressLabel : percent + '%',
            rightLabel = item.post ?
                         '' :
                         toHRDataSize(bigNumber(item.FileSizeHi,
                                   item.FileSizeLo)),
            centerLabel = item.post ? '' : estRem,
            kind = 'none';

        totalMBToDownload += remainingMB;

        item.status = detectGroupStatus(item);

        if(item.status === 'downloading' ||
           item.postprocess && !window.ngAPI.status.PostPaused) {
            kind = 'success';
        }
        else if(item.status === 'paused' ||
                item.postprocess && window.ngAPI.status.PostPaused) {
            kind = 'warning';
        }

        if(update) {
            post.querySelector('.tag').className = 'tag ' + item.status;
            post.querySelector('.tag span').innerText = item.status;
            post.querySelector('.bar-text.left').innerText = leftLabel;
            post.querySelector('.bar-text.center').innerText = centerLabel;
            post.querySelector('.bar-text.right').innerText = rightLabel;
            post.querySelector('.bar').style.width = percent + '%';
            post.querySelector('.bar').className = 'bar ' + kind;
        }
        else {
            post = $E({tag: 'div', className: 'post', rel: item.NZBID});
            // Tag
            post.appendChild($E({tag: 'div', className: 'tag ' + item.status}))
                .appendChild($E({tag: 'span', text: item.status}));

            // Info
            var info = post.appendChild($E({tag: 'div', className: 'info'}));
            info.appendChild($E({
                tag: 'div',
                text: item.NZBName,
                className: 'title'}));

            var progress = info.appendChild($E({
                    tag: 'div',
                    className: 'progress'}));
            progress.appendChild($E({
                tag: 'div',
                className: 'bar ' + kind,
                styles: {width: percent + '%'}}));
            progress.appendChild($E({
                tag: 'div',
                className: 'bar-text left',
                text: leftLabel}));
            progress.appendChild($E({
                tag: 'div',
                className: 'bar-text center',
                text: centerLabel}));
            progress.appendChild($E({
                tag: 'div',
                className: 'bar-text right',
                text: rightLabel}));

            var more = post.appendChild($E({
                tag: 'i',
                className: 'material-icons',
                text: 'more_vert'}));

            post.appendChild($E({
                tag: 'div',
                className: 'dropdown'}));
            more.addEventListener('click', setupContextMenu);

            setupDraggable(post);
            document.querySelector('#download_container').appendChild(post);
        }

        hwBadge(item, post);
    }

    /**
     * function cleanupList()
     * Remove unneeded elements and resort the list if needed
     *
     * @param  {array}   dataObj Array of objects containing at least sortorder
     * @param  {element} contEl  container element for the list
     * @return {void}
     */
    function cleanupList(dataObj, contEl) {
        var i = 0,
            sortNeeded = false,
            trElements = contEl.querySelectorAll('div.post');

        for(var k = 0; k < trElements.length; k++) {
            var id = trElements[k].getAttribute('rel');
            if(dataObj[id]) {
                if(i++ !== Number(dataObj[id].sortorder)) {
                    sortNeeded = true;
                }
            }
            else {
                contEl.removeChild(trElements[k]);
            }
        }

        if(sortNeeded) {
            var order = Object.keys(dataObj).sort(function(a, b) {
                return parseInt(dataObj[a].sortorder) -
                       parseInt(dataObj[b].sortorder);
            });
            for(i in order) {
                var el = contEl.querySelector(
                    'div.post[rel="' + order[i] + '"]');
                if(el) {
                    contEl.appendChild(contEl.removeChild(el));
                }
            }

        }
    }

    /**
     * function onStatusUpdated()
     *
     * Triggered whenever status is updated from server.
     * Sets speed, remaining and diskspace labels and resets
     * pause/resume button.
     *
     * @return {void}
     */
    function onStatusUpdated(){
        var downloadPaused = window.ngAPI.status.Download2Paused;

        /*document.querySelector('#tgl_pause').className = downloadPaused ?
                                                         'toggle resume' :
                                                         'toggle pause';*/
        document.querySelector('#tgl_pause').innerText = downloadPaused ?
                                                         'play_arrow' :
                                                         'pause';

        // Set "global" labels
        var speedLabel = '';
        if(window.ngAPI.status.DownloadRate) {
            speedLabel = toHRDataSize(
                Number(window.ngAPI.status.DownloadRate)) + '/s';
        }
        else {
            speedLabel = downloadPaused ? '- PAUSED -' : '';
        }

        var remainingLbl = bigNumber(
            window.ngAPI.status.RemainingSizeHi,
            window.ngAPI.status.RemainingSizeLo);

        document.querySelector('#lbl_speed').innerText = speedLabel;
        document.querySelector('#lbl_remainingmb').innerText =
            remainingLbl === 0 ? '' : toHRDataSize(remainingLbl);
        document.querySelector('#lbl_remainingdisk').innerText =
            toHRDataSize(bigNumber(window.ngAPI.status.FreeDiskSpaceHi,
                                   window.ngAPI.status.FreeDiskSpaceLo)) +
                         ' free';
    }

    /**
     * function onGroupsUpdated()
     * Triggered when groups are updated from server.
     *
     * @return {void}
     */
    function onGroupsUpdated(){
        var sortable = [];
        for (var i in window.ngAPI.groups)
            sortable.push(window.ngAPI.groups[i]);

        sortable.sort(function(a, b) {
            return parseInt(a.sortorder) - parseInt(b.sortorder);
        });


        // Build or update active download list
        totalMBToDownload = 0;
        for(var k in sortable) {
            downloadPost(sortable[k]);
        }

        cleanupList(window.ngAPI.groups,
                    document.querySelector('#download_container'));

        var inactiveContainer =
            document.querySelector('#download_container .inactive');
        if(!Object.keys(window.ngAPI.groups).length) {
            inactiveContainer.classList.add('shown');
        }
        else {
            inactiveContainer.classList.remove('shown');
        }
    }

    /**
     * Add or update a history entry
     *
     * @param {object} item Download item
     * @return {void}
     */
    function historyPost(item) {
        var parsed = window.ngAPI.parse.historyStatus(item),
            post = null;
        item.status = parsed[0];

        post = document.querySelector(
                '#history_list [rel="' + item.NZBID + '"]');
        var update = post !== null;

        if(update) {
            post.querySelector('.left').innerText = toHRTimeDiff(
                new Date(item.HistoryTime * 1000));
        }
        else {
            post = $E({tag: 'div', className: 'post', rel: item.NZBID});

            // Tag
            post.appendChild($E({tag: 'div', className: 'tag ' + item.status}))
                .appendChild($E({tag: 'span', text: item.status}));

            // Info
            var info = post.appendChild($E({tag: 'div', className: 'info'}));
            info.appendChild($E({tag: 'div',
                                 text: item.Name,
                                 className: 'title'}));
            var details = info.appendChild($E({tag: 'div',
                                               className: 'details'}));
            details.appendChild($E({tag: 'div',
                                    text: toHRTimeDiff(
                                        new Date(item.HistoryTime * 1000)),
                                    className: 'left'}));
            details.appendChild($E({tag: 'div',
                                    text: toHRDataSize(
                                        bigNumber(item.FileSizeHi,
                                                  item.FileSizeLo)),
                                    className: 'right'}));

            document.querySelector('#history_list').appendChild(post);
        }

        return post;
    }

    function searchHistory(historyList) {
        var srchElement = document.querySelector('.search'),
            filteredList = [];
        if(!srchElement.value) {
            return false;
        }
        for(var i = 0; i < historyList.length; i++) {
            if(!historyList[i].Name
                   .toLowerCase()
                   .replace(/[^0-9a-z]+/g, ' ')
                   .match(srchElement.value
                          .toLowerCase()
                          .replace(/[^0-9a-z]+/g, ' '))) {
                continue;
            }
            filteredList.push(historyList[i]);
        }
        return filteredList;
    }

    /**
     * function onHistoryUpdated()
     * Triggered when history is updated from server.
     *
     * @return {void}
     */
    function onHistoryUpdated() {
        var history = [];
        window.ngAPI.history(function(j) {
            var historyList = j.result,
                filteredList = searchHistory(historyList);
            if(filteredList !== false) {
                historyList = filteredList;
            }
            for(var i = 0;
                    i < window.ngAPI.Options.get('opt_historyitems') &&
                    i < historyList.length;
                    i++) {
                history[historyList[i].NZBID] = historyList[i];
                history[historyList[i].NZBID].sortorder = i;
                historyPost(historyList[i]);
            }
        });

        cleanupList(history, document.querySelector('#history_list'));
    }

    function resetTabs() {
        var tabs = document.querySelectorAll('.tab');
        for(var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
            tabs[tabIndex].classList.remove('active');
            var container = document.getElementById(
                tabs[tabIndex].getAttribute('data-container'));
            container.classList.remove('active');
        }
    }

    function modalDialog(header, body, buttons) {
        var shroud = document.querySelector('.shroud');
        shroud.querySelector('h2').innerHTML = header;
        shroud.querySelector('p').innerHTML = body;
        var btnbar = shroud.querySelector('.btnbar');
        btnbar.innerHTML = '';

        var clickFunc = function() {
            if(this.clickfunc) {
                this.clickfunc();
            }
            shroud.classList.remove('active');
        };

        for(var i in buttons) {
            var button = $E({
                tag: 'a',
                text: buttons[i].title});

            if(buttons[i].href) {
                button.href = buttons[i].href;
                button.target = '_blank';
            } else {
                button.href = '#';
            }
            button.clickfunc = buttons[i].onClick;
            button.closeOnClick = buttons[i].closeOnClick;
            button.addEventListener('click', clickFunc);

            btnbar.appendChild(button);

        }
        shroud.classList.add('active');
    }

    function switchTab(event) {
        resetTabs();
        event.target.classList.add('active');
        var container = document.getElementById(
            event.target.getAttribute('data-container'));
        container.classList.add('active');
    }

    document.addEventListener('DOMContentLoaded', function() {
        chrome.runtime.connect();
        window.ngAPI = chrome.extension.getBackgroundPage().ngAPI;
        var tabs = document.querySelectorAll('.tab');
        for(var tabIndex = 0; tabIndex < tabs.length; tabIndex++) {
            tabs[tabIndex].addEventListener('click', switchTab);
        }

        if(!window.ngAPI.isInitialized || !window.ngAPI.connectionStatus) {
            modalDialog(
                'Connection failure!',
                'Could not connect to NZBGet.<br>' +
                    'Please ensure that the server is running and ' +
                    'check your connection settings.',
                [{title: 'options page', href: 'options.html'}]
            );
        }

        chrome.runtime.onMessage.addListener(
            function(request) {
                switch(request.statusUpdated) {
                    case 'groups':
                        onGroupsUpdated();
                        break;
                    case 'history':
                        if(window.ngAPI.Options.get('opt_historyitems') > 0) {
                            setTimeout(onHistoryUpdated, 1500);
                        }
                        break;
                    case 'status':
                        onStatusUpdated();
                        break;
                }
            }
        );
        onGroupsUpdated();
        if(window.ngAPI.Options.get('opt_historyitems') === 0) {
            document.querySelector('#history_container').style.display = 'none';
        }
        else {
            onHistoryUpdated();
        }

        document.querySelector('.search')
        .addEventListener('search', function() {
            onHistoryUpdated();
        });

        onStatusUpdated();
        document.body.addEventListener('click', function() {
            var els = document.querySelectorAll('div.contextmenu');
            for(var i = 0; i < els.length; i++) {
                els[i].style.display = 'none';
            }
        });
        document.querySelector('#tgl_pause')
        .addEventListener('click', function() {
            var method = !window.ngAPI.status.Download2Paused ?
                         'pausedownload2' :
                         'resumedownload2';
            window.ngAPI.sendMessage(method, [], function() {
                window.ngAPI.updateStatus();
                window.ngAPI.updateGroups();
            });
        });
        document.querySelector('#logo')
        .addEventListener('click', function() {
            window.ngAPI.switchToNzbGetTab();
        });
    });
})();
