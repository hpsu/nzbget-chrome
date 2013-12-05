/***
* @TODO: Show postprocessing status. (merge with postqueue)
* @TODO: Take sort order into consideration when adding new posts to history or groups
*/

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

/* Format stuff */ 
Number.prototype.zeroPad =  function() {
	return (Number(this) < 10 ? '0' : '') + String(this);
};
Number.prototype.formatTimeDiff = function(){ 
	var date = new Date(this),
		diff = (((new Date()).getTime() - date.getTime()) / 1000),
		day_diff = Math.floor(diff / 86400);

	if ( isNaN(day_diff) || day_diff < 0 || day_diff >= 31 )
		return;

	return day_diff == 0 && (
			diff < 60 && "just now" ||
			diff < 120 && "1 min ago" ||
			diff < 3600 && Math.floor( diff / 60 ) + " mins ago" ||
			diff < 7200 && "1 hour ago" ||
			diff < 86400 && Math.floor( diff / 3600 ) + " hours ago") ||
		day_diff == 1 && "Yesterday "+date.getHours().zeroPad()+':'+date.getMinutes().zeroPad() ||
		Number(this).formatDateTime()
};
Number.prototype.formatTimeLeft = function(){
	var hms = '';
	var days = Math.floor(this / 86400);
	var hours = Math.floor((this % 86400) / 3600);
	var minutes = Math.floor((this / 60) % 60);
	var seconds = Math.floor(this % 60);

	if (days > 10) {
		return days + 'd';
	}
	if (days > 0) {	
		return days + 'd ' + hours + 'h';
	}
	if (hours > 0) {
		return hours + 'h ' + minutes.zeroPad() + 'm';
	}
	if (minutes > 0) {
		return minutes + 'm ' + seconds.zeroPad() + 's';
	}

	return seconds + 's';
};
Number.prototype.formatDateTime = function(){
	var x = new Date(this);
	return x.getFullYear()+'-'+x.getMonth().zeroPad()+'-'+x.getDate().zeroPad()+' '+x.getHours().zeroPad()+':'+x.getMinutes().zeroPad()
};

function formatSizeMB(sizeMB, sizeLo) {
	if (sizeLo !== undefined && sizeMB < 100) {
		sizeMB = sizeLo / 1024 / 1024;
	}

	if (sizeMB > 10240) {
		return (sizeMB / 1024.0).toFixed(1) + ' GiB';
	}
	else if (sizeMB > 1024) {
		return (sizeMB / 1024.0).toFixed(2) + ' GiB';
	}
	else if (sizeMB > 100) {
		return sizeMB.toFixed(0) + ' MiB';
	}
	else if (sizeMB > 10) {
		return sizeMB.toFixed(1) + ' MiB';
	}
	else {
		return Number(sizeMB).toFixed(2) + ' MiB';
	}
}

function detectGroupStatus(group) {
	group.paused = (group.PausedSizeLo != 0) && (group.RemainingSizeLo == group.PausedSizeLo);
	if (group.postprocess) {
		return 'postprocess';
	}
	else if (group.ActiveDownloads > 0) {
		return 'downloading';
	}
	else if (group.paused) {
		return 'paused';
	}
	else {
		return 'queued';
	}
}

function detectStatus(hist) {
	if (hist.Kind === 'NZB') {
		if (hist.ParStatus == 'FAILURE' || hist.UnpackStatus == 'FAILURE' || hist.MoveStatus == 'FAILURE' || hist.ScriptStatus == 'FAILURE')
			return 'failure';
		else if (hist.ParStatus == 'MANUAL')
			return 'damaged';
		else {
			switch (hist.ScriptStatus) {
				case 'SUCCESS': return 'success';
				case 'UNKNOWN': return 'unknown';
				case 'NONE':
					switch (hist.UnpackStatus) {
						case 'SUCCESS': return 'success';
						case 'NONE':
							switch (hist.ParStatus) {
								case 'SUCCESS': return 'success';
								case 'REPAIR_POSSIBLE': return 'repairable';
								case 'NONE': return 'unknown';
							}
					}
			}
		}
	}
	else if (hist.Kind === 'URL') {
		switch (hist.UrlStatus) {
			case 'SUCCESS': return 'success';
			case 'FAILURE': return 'failure';
			case 'UNKNOWN': return 'unknown';
		}
	}
}

function onGroupsUpdated(){
	$('download_table').style['display'] = api.groups.result.length > 0 ? 'block' : 'none';

	// Build or update active download list
	for(k in api.groups.result) {
		downloadPost(api.groups.result[k]);
	};

	// Remove completed downloads from "Active downloads"
	var trElements = $('download_container').querySelectorAll('div.post');
	for(var k = 0; k<trElements.length; k++) {
		var match = false;
		for(sk in api.groups.result) {
			if(api.groups.result[sk].NZBID == trElements[k].getAttribute('rel')) match=true;
		}
		if(!match) $('download_container').removeChild(trElements[k]);
	}

	// Set "global" labels
	if($('lbl_speed').hasChildNodes()) $('lbl_speed').removeChild($('lbl_speed').firstChild);
	if($('lbl_remainingmb').hasChildNodes()) $('lbl_remainingmb').removeChild($('lbl_remainingmb').firstChild);
	$('lbl_speed').appendChild(document.createTextNode((api.status.DownloadRate / 1024).toFixed(2) + ' KB/s'));
	$('lbl_remainingmb').appendChild(document.createTextNode(formatSizeMB(Number(api.status.RemainingSizeMB), Number(api.status.RemainingSizeLo))));
}

function onHistoryUpdated(){
	api.history(function(j){
		for(var i=0; i<10; i++) {
			historyPost(j.result[i]);
		}
	});
}

function historyPost(item) {
	item.status = detectStatus(item);
	var post = $('history_container').querySelector('[rel="' + item.NZBID + '"]')
		,update	= post !== null;
	
	if(update) {
		post.querySelector('.left').innerText = Number(item.HistoryTime*1000).formatTimeDiff();
	}
	else {
		var post = $E({tag: 'div', className: 'post', rel: item.NZBID});
		post.setAttribute('draggable', true);
		post.addEventListener('dragstart', function(e){
			this.style.opacity='0.4';
			e.dataTransfer.effectAllowed = 'move';
  			e.dataTransfer.setData('text/html', this.innerHTML);
		});
			// Tag
			post.appendChild($E({tag: 'div', className: 'tag '+item.status}))
				.appendChild($E({tag: 'span', text: item.status}));

			// Info
			var info = post.appendChild($E({tag: 'div', className: 'info'}));
				info.appendChild($E({tag: 'div', text: item.Name, className: 'title'}));
				var details = info.appendChild($E({tag: 'div', className: 'details'}));
					details.appendChild($E({tag: 'div', text: Number(item.HistoryTime*1000).formatTimeDiff(), className: 'left'}));
					details.appendChild($E({tag: 'div', text: formatSizeMB(item.FileSizeMB, item.FileSizeLo), className: 'right'}));
			$('history_container').appendChild(post);
	}

	return post;
}

function downloadPost(item) {
	var totalMB		= item.FileSizeMB-item.PausedSizeMB
		,remainingMB= item.RemainingSizeMB-item.PausedSizeMB
		,percent	= Math.round((totalMB - remainingMB) / totalMB * 100)
		,remaining	= formatSizeMB(remainingMB, item.RemainingSizeLo)
		,total		= formatSizeMB(item.FileSizeMB, item.FileSizeLo)
		,estRem		= ((item.RemainingSizeMB-item.PausedSizeMB)*1024/(api.status.DownloadRate/1024)).formatTimeLeft()
		,post		= $('download_container').querySelector('[rel="' + item.NZBID + '"]')
		,update		= post !== null;
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
		post.querySelector('.bar-text.left').innerText = percent+'%';
		post.querySelector('.bar-text.right').innerText = formatSizeMB(item.FileSizeMB, item.FileSizeLo);
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
					progress.appendChild($E({tag: 'div', className: 'bar-text left', text: percent+'%'}));
					progress.appendChild($E({tag: 'div', className: 'bar-text right', text: formatSizeMB(item.FileSizeMB, item.FileSizeLo)}));
		$('download_container').appendChild(post);
	}

	return post;
}

document.addEventListener('DOMContentLoaded', function() {
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
					onHistoryUpdated();
					break;
			}
		}
	);
	$('history_container').addEventListener('dragover', function(ev){
		ev.preventDefault();
	});
	$('history_container').addEventListener('drop', function(ev){
		console.log(ev);
		ev.preventDefault();
	});
	onGroupsUpdated();
	onHistoryUpdated();
	$('logo').addEventListener('click', function() {
		api.switchToNzbGetTab();
	});
});