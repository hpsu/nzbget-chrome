function $(o) {return document.getElementById(o);}

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

function detectGroupStatus(group) {
	group.paused = (group.PausedSizeLo != 0) && (group.RemainingSizeLo == group.PausedSizeLo);
	group.postprocess = group.post !== undefined;
	if (group.postprocess) {
		switch (group.post.Stage) {
			case 'QUEUED': group.status = 'pp-queued'; break;
			case 'LOADING_PARS': group.status = 'checking'; break;
			case 'VERIFYING_SOURCES': group.status = 'checking'; break;
			case 'REPAIRING': group.status = 'repairing'; break;
			case 'VERIFYING_REPAIRED': group.status = 'verifying'; break;
			case 'RENAMING': group.status = 'renaming'; break;
			case 'MOVING': group.status = 'moving'; break;
			case 'UNPACKING': group.status = 'unpacking'; break;
			case 'EXECUTING_SCRIPT': group.status = 'processing'; break;
			case 'FINISHED': group.status = 'finished'; break;
			default: group.status = 'error: ' + group.post.Stage; break;
		}
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

function row(indata, replace) {
	var tr = replace ? replace : document.createElement('tr');
	for(var i=0;i < indata.length; i++) {
		var td = replace ? replace.children[i] : document.createElement('td');
		if(replace) td.removeChild(td.firstChild);
		if (typeof indata[i] === 'object') 
			td.appendChild(indata[i]);
		else
			td.appendChild(document.createTextNode(indata[i]));

		if(!replace) tr.appendChild(td);
	}
	return tr;
}

function E(type, text, className, styles) {
	var tmp = document.createElement(type);
	if(className) tmp.className = className;
	if(text) tmp.appendChild(document.createTextNode(text));
	if(styles) for(k in styles) {
		tmp.style[k] = styles[k];
	}
	return tmp;
}


function onGroupsUpdated(){
	api = chrome.extension.getBackgroundPage().ngAPI;
	for(k in api.groups.result) {
		o = api.groups.result[k];
		var totalMB = o.FileSizeMB-o.PausedSizeMB;
		var remainingMB = o.RemainingSizeMB-o.PausedSizeMB;
		var percent = Math.round((totalMB - remainingMB) / totalMB * 100);

		var remaining = formatSizeMB(remainingMB, o.RemainingSizeLo)
			,total = formatSizeMB(o.FileSizeMB, o.FileSizeLo);

		var big = E('div', null, 'progress-block');
		var prog = big.appendChild(E('div', null, 'progress progress-striped progress-success'));
		big.appendChild(E('div', total, 'bar-text-left'));
		big.appendChild(E('div', remaining, 'bar-text-right'));
		prog.appendChild(E('div', null, 'bar', {width: percent+'%'}));
		o.status = detectGroupStatus(o);
		tr = row([E('div', o.status, 'tag '+o.status), o.NZBName, big, ((o.RemainingSizeMB-o.PausedSizeMB)*1024/(api.status.DownloadRate/1024)).formatTimeLeft()], $('download_cont').querySelector('TR[rel="' + o.NZBID + '"]'));
		tr.setAttribute('rel', o.NZBID);

		$('download_cont').appendChild(tr);
	};

	if($('lbl_speed').hasChildNodes()) $('lbl_speed').removeChild($('lbl_speed').firstChild);
	if($('lbl_remainingmb').hasChildNodes()) $('lbl_remainingmb').removeChild($('lbl_remainingmb').firstChild);
	$('lbl_speed').appendChild(document.createTextNode((api.status.DownloadRate / 1024).toFixed(2) + ' KB/s'));
	$('lbl_remainingmb').appendChild(document.createTextNode(formatSizeMB(Number(api.status.RemainingSizeMB), Number(api.status.RemainingSizeLo))));

	var trElements = $('download_cont').querySelectorAll('tr');
	for(var k = 0; k<trElements.length; k++) {
		var match = false;
		for(sk in api.groups.result) {
			if(api.groups.result[sk].NZBID == trElements[k].getAttribute('rel')) match=true;
		}
		if(!match) $('download_cont').removeChild(trElements[k]);
	}
}

document.addEventListener('DOMContentLoaded', function() {
	api = chrome.extension.getBackgroundPage().ngAPI;
	opts = api.Options;

	/* Setup variables */
	// {"RemainingSizeLo":0,"RemainingSizeHi":0,"RemainingSizeMB":0,"DownloadedSizeLo":4009763785,"DownloadedSizeHi":52,"DownloadedSizeMB":216816,"DownloadRate":0,"AverageDownloadRate":4607597,"DownloadLimit":0,"ThreadCount":5,"ParJobCount":0,"PostJobCount":0,"UrlCount":0,"UpTimeSec":2348634,"DownloadTimeSec":49342,"ServerPaused":false,"DownloadPaused":false,"Download2Paused":false,"ServerStandBy":true,"PostPaused":false,"ScanPaused":false,"FreeDiskSpaceLo":127795200,"FreeDiskSpaceHi":2057,"FreeDiskSpaceMB":8425593,"ServerTime":1384806423,"ResumeTime":0}}

	chrome.runtime.onMessage.addListener(
		function(request, sender, sendResponse) {
			if (request.statusUpdated && request.statusUpdated == 'groups') {
				onGroupsUpdated();
			}
		}
	);
	onGroupsUpdated();

	/* Setup history */
	api.history(function(j){
		for(var i=0; i<10; i++) {
			var litem = j.result[i];
			litem.status = detectStatus(litem);
			tr = row([
				litem.status
				,litem.Name
				,Number(litem.HistoryTime*1000).formatTimeDiff()
				,formatSizeMB(litem.FileSizeMB, litem.FileSizeLo)
			]);
			tr.childNodes[0].className = 'tag '+litem.status;
			tr.childNodes[3].className = 'r';
			document.getElementById('history_cont').appendChild(tr);
		}
	});
});