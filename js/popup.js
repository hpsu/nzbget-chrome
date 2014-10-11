var dragging = null
	,MAX32 = 4294967296;

/* "Framework" stuff */
function $(o) {
	return document.getElementById(o);
}
function $E(params) {
	var tmp = document.createElement(params.tag);
	if(params.className) tmp.className = params.className;
	if(params.text) tmp.appendChild(document.createTextNode(params.text));
	if(params.styles) for(k in params.styles) {
		tmp.style[k] = params.styles[k];
	}
	if(params.rel) tmp.setAttribute('rel', params.rel);
	return tmp;
}

/**
 * BigNumber
 * Combines two 32-bit integers to a 64-bit Double (may lose data with extreme sizes)
 */
function BigNumber(hi,lo) {
	return Number(hi * MAX32 + lo);
};

/**
 * function index()
 * Get elements "position" in relation to it's siblings
 */
Element.prototype.index = function() {
	if(!this.parentNode) return -1;
	return [].indexOf.call(this.parentNode.children, this);
}

/**
 * function toHRTimeDiff()
 * Compares Date object to current Date and outputs human readable time diff
 */
Date.prototype.toHRTimeDiff = function(){
	var	diff = (((new Date()).getTime() - this.getTime()) / 1000),
		day_diff = Math.floor(diff / 86400);

	if (isNaN(day_diff) || day_diff < 0)
		return;

	return day_diff == 0 && (
			diff < 60 && "just now" ||
			diff < 120 && "1 min ago" ||
			diff < 3600 && Math.floor( diff / 60 ) + " mins ago" ||
			diff < 7200 && "1 hour ago" ||
			diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
		day_diff == 1 && "Yesterday "+this.toLocaleTimeString() ||
		this.toLocaleString()
};

/**
 * function zeroPad()
 * adds a zero before an integer if needed to make it a string at least two characters wide
 */
Number.prototype.zeroPad =  function() {
	return (Number(this) < 10 ? '0' : '') + String(this);
};

/**
 * function toHRTimeLeft()
 * Formats an integer of seconds to a human readable string
 */
Number.prototype.toHRTimeLeft = function(){
	var days = Math.floor(this / 86400);
	if (days > 10)
		return days + 'd';

	var hours = Math.floor((this % 86400) / 3600);
	if (days > 0)
		return days + 'd ' + hours + 'h';

	var minutes = Math.floor((this / 60) % 60);
	if (hours > 0) {
		return hours + 'h ' + minutes.zeroPad() + 'm';
	}

	var seconds = Math.floor(this % 60);
	if (minutes > 0) {
		return minutes + 'm ' + seconds.zeroPad() + 's';
	}

	return seconds + 's';
};

/**
 * function formatHRSize()
 * Formats an integer of seconds to a human readable string
 */
Number.prototype.toHRDataSize = function() {
	var sizes = {1:['KiB',0], 2:['MiB',1], 3:['GiB',2], 4:['TiB',2]},
	output = null;
	Object.keys(sizes).reverse().forEach( function(i) {
		if(!output && this >= Math.pow(1024, i)) {
			var nmr = (this/Math.pow(1024, i));
			output = nmr.toFixed(nmr<100 ? sizes[i][1]: 0) + ' ' +sizes[i][0];
		}
	}.bind(this));
	return output !== null ? output : this + 'B';
}

/**
 * function detectGroupStatus()
 * Returns a string representing current download status
 */
function detectGroupStatus(group) {
	switch(true) {
		case typeof group.post != 'undefined':
			return 'postprocess';
		case group.ActiveDownloads > 0:
			return 'downloading';
		case (group.PausedSizeLo != 0) && (group.RemainingSizeLo == group.PausedSizeLo):
			return 'paused';
	}
	return 'queued';
}


/**
 * function detectHistoryStatus()
 * Returns a string a history entrys status
 */
function detectHistoryStatus(hist) {
	if (hist.Kind === 'NZB') {
		switch(true) {
			case hist.ParStatus == 'FAILURE':
			case hist.UnpackStatus == 'FAILURE':
			case hist.MoveStatus == 'FAILURE':
			case hist.ScriptStatus == 'FAILURE':
				return 'failure';
			case hist.ParStatus == 'MANUAL':
				return 'damaged';
			case hist.ScriptStatus == 'UNKNOWN':
				return 'unknown';
			case hist.ScriptStatus == 'SUCCESS':
			case hist.UnpackStatus == 'SUCCESS':
			case hist.ParStatus == 'SUCCESS':
				return 'success';
			case hist.ParStatus == 'REPAIR_POSSIBLE':
				return 'repairable';
			case hist.ParStatus == 'NONE':
				return 'unknown';
		}
	} else if (hist.Kind === 'URL') {
		switch (hist.UrlStatus) {
			case 'SUCCESS': return 'success';
			case 'FAILURE': return 'failure';
			case 'UNKNOWN': return 'unknown';
		}
	}
}

/**
 * function cleanupList() - Remove unneeded elements and resort the list if needed
 *
 * @var Array dataObj Array of objects containing at least sortorder
 * @var Element contEl container element for the list
 */
function cleanupList(dataObj, contEl) {
	var i = 0
		,sortNeeded = false
		,trElements = contEl.querySelectorAll('div.post');
	for(var k = 0; k<trElements.length; k++) {
		var id = trElements[k].getAttribute('rel');
		if(dataObj[id]) {
			if(i++ != dataObj[id].sortorder) sortNeeded = true;
		}
		else {
			contEl.removeChild(trElements[k]);
		}
	}

	if(sortNeeded) {
		order = Object.keys(dataObj).sort(function(a,b) {
			a = dataObj[a].sortorder;
			b = dataObj[b].sortorder;
			if(a < b) return -1;
			if(a > b) return 1;
			return 0;
		});
		for(i in order) {
			var el = contEl.querySelector('div.post[rel="' + order[i] + '"]');
			if(el) contEl.appendChild(contEl.removeChild(el));
		}

	}
}

/**
 * function onStatusUpdated() - Triggered whenever status is updated from server.
 * Sets speed, remaining and diskspace labels and resets pause/resume button.
 */
function onStatusUpdated(){
	var downloadPaused = api.status.Download2Paused;

	$('tgl_pause').className = downloadPaused ? 'toggle resume' : 'toggle pause';
	
	// Set "global" labels
	if(api.status.DownloadRate)
		speedLabel = Number(api.status.DownloadRate).toHRDataSize() + '/s';
	else
		speedLabel = downloadPaused ? '- PAUSED -' : 'idle';

	var remainingLbl = BigNumber(api.status.RemainingSizeHi, api.status.RemainingSizeLo);

	$('lbl_speed').innerText = speedLabel;
	$('lbl_remainingmb').innerText = remainingLbl == 0 ? 'nothing' : remainingLbl.toHRDataSize();
	$('lbl_remainingdisk').innerText = BigNumber(api.status.FreeDiskSpaceHi, api.status.FreeDiskSpaceLo).toHRDataSize();
}

/**
 * function onGroupsUpdated() - Triggered when groups are updated from server.
 */
function onGroupsUpdated(){
	$('download_table').style['display'] = Object.keys(api.groups).length > 0 ? 'block' : 'none';

	// Build or update active download list
	for(k in api.groups) {
		downloadPost(api.groups[k]);
	};

	cleanupList(api.groups, $('download_container'));
}

/**
 * function onHistoryUpdated() - Triggered when history is updated from server.
 */
function onHistoryUpdated(){
	var history = [];
	api.history(function(j){
		for(var i=0; i<api.Options.get('opt_historyitems'); i++) {
			history[j.result[i].NZBID] = j.result[i];
			history[j.result[i].NZBID].sortorder = i;
			historyPost(j.result[i]);
		}
	});

	cleanupList(history, $('history_container'));
}

/**
 * function setupDraggable() - Setup drag'n'drop on an element with all associated event handlers
 * also adds a placeholder element that gets moved around while dragging
 */
function setupDraggable(post) {
	post.setAttribute('draggable', true);
	post.placeholder = $E({tag: 'div', className: 'placeholder'});
	post.indexBefore = 0;

	dover = function (ev) {
		ev.preventDefault();
		ev.dataTransfer.dropEffect = 'move';

		if(this.classList.contains('post')) {
			if(dragging.offsetHeight)
				dragging.storedHeight = dragging.offsetHeight;
			if(dragging.storedHeight) this.placeholder.style.height = dragging.storedHeight+'px';
			dragging.style.display='none';
			var pholders = this.parentElement.querySelectorAll('div.placeholder');
			for(var i = 0; i<pholders.length; i++) {
				if(pholders[i] != this.placeholder)
					pholders[i].parentNode.removeChild(pholders[i]);
			};

			this.parentElement.insertBefore(this.placeholder, this.placeholder.index() < this.index() ? this.nextSibling : this);
		}
		return false;
	};
	drop = function (ev) {
		ev.preventDefault();
		this.parentElement.insertBefore(dragging, this.parentElement.querySelector('.placeholder'));
		if(dragging.indexBefore != dragging.index()) {
			dragging.dispatchEvent(new CustomEvent('sortupdate', {detail:{
				oldIndex: dragging.indexBefore
				,newIndex: dragging.index()
				,nzbID: dragging.getAttribute('rel')
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
		dragging.style.display='flex';
		var pholders = document.querySelectorAll('div.placeholder');
		for(var i = 0; i<pholders.length; i++) {
			pholders[i].parentNode.removeChild(pholders[i]);
		};
		dragging = null;
	});

	post.addEventListener('dragover', dover);
	post.addEventListener('dragenter', dover);
	post.addEventListener('drop', drop);
	post.addEventListener('sortupdate', function(e){
		var oldI = e.detail.oldIndex
			,newI = e.detail.newIndex
			,diff = (newI-oldI)
			,fileId = api.groups[e.detail.nzbID].LastID;

		api.sendMessage('editqueue', ['GroupMoveOffset', diff, '', [fileId]], function(res) {
			console.log(res);
		});
	});

	post.placeholder.addEventListener('dragover', dover);
	post.placeholder.addEventListener('dragenter', dover);
	post.placeholder.addEventListener('drop', drop);

}
/**
 * Add or update a history entry
 */
function historyPost(item) {
	item.status = detectHistoryStatus(item);
	var post = $('history_container').querySelector('[rel="' + item.NZBID + '"]')
		,update	= post !== null;

	if(update) {
		post.querySelector('.left').innerText = new Date(item.HistoryTime*1000).toHRTimeDiff();
	}
	else {
		var post = $E({tag: 'div', className: 'post', rel: item.NZBID});

			// Tag
			post.appendChild($E({tag: 'div', className: 'tag '+item.status}))
				.appendChild($E({tag: 'span', text: item.status}));

			// Info
			var info = post.appendChild($E({tag: 'div', className: 'info'}));
				info.appendChild($E({tag: 'div', text: item.Name, className: 'title'}));
				var details = info.appendChild($E({tag: 'div', className: 'details'}));
					details.appendChild($E({tag: 'div', text: new Date(item.HistoryTime*1000).toHRTimeDiff(), className: 'left'}));
					details.appendChild($E({tag: 'div', text: BigNumber(item.FileSizeHi, item.FileSizeLo).toHRDataSize(), className: 'right'}));

			$('history_container').appendChild(post);
	}

	return post;
}

/**
 * Health warning badge
 */
function hwBadge(item, post) {
	if(item.Health < 1000 && (!item.postprocess || (item.status === 'pp-queued' && item.post.TotalTimeSec === 0))) {
		var hwBadge = post.querySelector('span.health-warning')
			,hwClass = 'health-warning'+(item.Health < item.CriticalHealth ? ' critical' : '')
			,hwLbl = 'health: ' + Math.floor(item.Health / 10)+'%';

		if(hwBadge) {
			hwBadge.className = hwClass;
			hwBadge.innerText = hwLbl;
		} else {
			var h = $E({tag:'span', className: hwClass, text: hwLbl});
			post.querySelector('.title').appendChild(h);
		}
	}
}

/**
 * Add or update a download entry
 */
function downloadPost(item) {
	var totalMB		= item.FileSizeMB-item.PausedSizeMB
		,remainingMB= item.RemainingSizeMB-item.PausedSizeMB
		,percent	= Math.round((totalMB - remainingMB) / totalMB * 100)
		,estRem		= ((item.RemainingSizeMB-item.PausedSizeMB)*1024/(api.status.DownloadRate/1024)).toHRTimeLeft()
		,post		= $('download_container').querySelector('[rel="' + item.NZBID + '"]')
		,update		= post !== null
		,leftLabel	= item.post ? item.post.ProgressLabel : percent+'%'
		,rightLabel	= item.post ? '' : BigNumber(item.FileSizeHi, item.FileSizeLo).toHRDataSize();
	item.status = detectGroupStatus(item);

	if(item.status === 'downloading' || (item.postprocess && !api.status.PostPaused))
		var kind = 'success';
	else if(item.status === 'paused' || (item.postprocess && api.status.PostPaused))
		var kind = 'warning';
	else
		var kind = 'none';

	if(update) {
		post.querySelector('.tag').className = 'tag '+item.status;
		post.querySelector('.tag span').innerText = item.status;
		post.querySelector('.bar-text.left').innerText = leftLabel;
		post.querySelector('.bar-text.right').innerText = rightLabel;
		post.querySelector('.bar').style.width = (percent)+'%';
		post.querySelector('.bar').className = 'bar '+kind;
	}
	else {
		var post = $E({tag: 'div', className: 'post', rel: item.NZBID});
			// Tag
			post.appendChild($E({tag: 'div', className: 'tag '+item.status}))
				.appendChild($E({tag: 'span', text: item.status}));

			// Info
			var info = post.appendChild($E({tag: 'div', className: 'info'}));
				info.appendChild($E({tag: 'div', text: item.NZBName, className: 'title'}));

				var progress = info.appendChild($E({tag: 'div', className:'progress'}));
					progress.appendChild($E({tag: 'div', className: 'bar '+kind, styles: {width: percent+'%'}}));
					progress.appendChild($E({tag: 'div', className: 'bar-text left', text: leftLabel}));
					progress.appendChild($E({tag: 'div', className: 'bar-text right', text: rightLabel}));

			var dd = post.appendChild($E({tag: 'div', className: 'dropdown'})).appendChild($E({tag: 'div', 'className': 'down'}));
			dd.parentNode.addEventListener('click', setupContextMenu);

		setupDraggable(post);
		$('download_container').appendChild(post);
	}

	hwBadge(item, post);

	return post;
}

function setupContextMenu(e){
	e.stopPropagation();
	var ctxm = this.querySelector('div.contextmenu');
	if(ctxm) {
		if(getComputedStyle(ctxm).display == 'block')
			ctxm.style.display = 'none';
		else
			ctxm.style.display = 'block';

		pse = ctxm.querySelector('li.pause');
	}
	else {
		this.ctxm = this.appendChild($E({tag: 'div', className: 'contextmenu'}));
			var ul = this.ctxm.appendChild($E({tag: 'ul'}));
				var pse = ul.appendChild($E({tag: 'li', className:'pause', text: 'Pause'}));
				var del = ul.appendChild($E({tag: 'li', className:'delete', text: 'Delete'}));

		pse.addEventListener('click', function(e){
			e.stopPropagation();
			this.style.display='none';
			var nid = this.parentNode.parentNode.getAttribute('rel')
				,fileId = api.groups[nid].LastID
				,status = api.groups[nid].status
				,method = (status == 'paused' ? 'GroupResume' : 'GroupPause');

			api.sendMessage('editqueue', [method, 0, '', [fileId]], function(res) {});

		}.bind(this.ctxm));
		del.addEventListener('click', function(e){
			e.stopPropagation();
			this.style.display='none';
			var nid = this.parentNode.parentNode.getAttribute('rel')
				,fileId = api.groups[nid].LastID
				,status = api.groups[nid].status;
			if(confirm('Are you sure?')) {
				api.sendMessage('editqueue', ['GroupDelete', 0, '', [fileId]], function(res) {});
			}
		}.bind(this.ctxm));
		ctxm = this.ctxm;
	}
	pse.innerText = api.groups[ctxm.parentNode.parentNode.getAttribute('rel')].status == 'paused' ? 'Resume' : 'Pause';
}

document.addEventListener('DOMContentLoaded', function() {
	chrome.runtime.connect();
	window.api = chrome.extension.getBackgroundPage().ngAPI;

	if(!api.isInitialized || !api.connectionStatus) {
		$('download_table').style.display='none';
		$('history_table').style.display='none';
		$('setup_needed').style.display='block';
		return;
	}

	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			switch(request.statusUpdated) {
				case 'groups':
					onGroupsUpdated();
					break;
				case 'history':
					if(api.Options.get('opt_historyitems') > 0)
						setTimeout(onHistoryUpdated,1500);
					break;
				case 'status':
					onStatusUpdated();
					break;
			}
		}
	);
	onGroupsUpdated();
	if(api.Options.get('opt_historyitems') == 0)
		$('history_table').style.display='none';
	else
		onHistoryUpdated();

	onStatusUpdated();
	document.body.addEventListener('click', function() {
		var els = document.querySelectorAll('div.contextmenu');
		for(var i=0; i<els.length; i++) {
			els[i].style.display='none';
		}
	});
	$('tgl_pause').addEventListener('click', function() {
		method = this.classList.contains('pause') ? 'pausedownload2' : 'resumedownload2';
		api.sendMessage(method, [], function() {
			api.updateStatus();
			api.updateGroups();
		});
	});
	$('logo').addEventListener('click', function() {
		api.switchToNzbGetTab();
	});
});
