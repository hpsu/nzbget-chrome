Number.implement({
	zeroPad: function() {
		return (Number(this) < 10 ? '0' : '') + String(this);
	}
	,formatTimeDiff: function(){ 
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
	}
	,formatTimeLeft: function(){
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
	}
	,formatDateTime: function(){
		var x = new Date(this);
		return x.getFullYear()+'-'+x.getMonth().zeroPad()+'-'+x.getDate().zeroPad()+' '+x.getHours().zeroPad()+':'+x.getMinutes().zeroPad()
	}
});

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
		return (sizeMB / 1024.0).round(1) + ' GiB';
	}
	else if (sizeMB > 1024) {
		return (sizeMB / 1024.0).round(2) + ' GiB';
	}
	else if (sizeMB > 100) {
		return sizeMB.round(0) + ' MiB';
	}
	else if (sizeMB > 10) {
		return sizeMB.round(1) + ' MiB';
	}
	else {
		return sizeMB.round(2) + ' MiB';
	}
}

function onGroupsUpdated(){
	api = chrome.extension.getBackgroundPage().ngAPI;
	Array.each(api.groups.result, function(o){

		var totalMB = o.FileSizeMB-o.PausedSizeMB;
		var remainingMB = o.RemainingSizeMB-o.PausedSizeMB;
		var percent = Math.round((totalMB - remainingMB) / totalMB * 100);

		var remaining = formatSizeMB(remainingMB, o.RemainingSizeLo)
			,total = formatSizeMB(o.FileSizeMB, o.FileSizeLo);

		var tr = $('download_cont').getElement('[rel='+o.NZBID+']');
		if(tr) {
			var td2 = tr.getElements('td')[1];
			td2.getChildren().destroy();
			var td3 = tr.getElements('td')[2];
		}
		else {
			tr = new Element('tr',{rel: o.NZBID}).inject($('download_cont'));
			var td1 = new Element('td', {text: o.NZBName}).inject(tr);
			var td2 = new Element('td').inject(tr);
			var td3 = new Element('td').inject(tr);
		}
		td3.set('text', ((o.RemainingSizeMB-o.PausedSizeMB)*1024/(api.status.DownloadRate/1024)).formatTimeLeft());
		var big = new Element('div', {class: 'progress-block'}).inject(td2);
		var prog = new Element('div', {class: 'progress progress-striped progress-success'}).inject(big);
		var bar = new Element('div', {class: 'bar', styles: {width: percent+'%'}}).inject(prog);

		var left = new Element('div', {class: 'bar-text-left', text: total}).inject(big);
		var right = new Element('div', {class: 'bar-text-right', text: remaining}).inject(big);

		$('lbl_speed').set('text', formatSizeMB(Number(api.status.RemainingSizeMB), Number(api.status.RemainingSizeLo)));
		$('lbl_remainingmb').set('text', (api.status.DownloadRate / 1024).round(2) + ' KB/s');

	});
}

window.addEvent('domready', function(){
	api = chrome.extension.getBackgroundPage().ngAPI;
	opts = api.Options;

	/* Setup variables */
	// {"RemainingSizeLo":0,"RemainingSizeHi":0,"RemainingSizeMB":0,"DownloadedSizeLo":4009763785,"DownloadedSizeHi":52,"DownloadedSizeMB":216816,"DownloadRate":0,"AverageDownloadRate":4607597,"DownloadLimit":0,"ThreadCount":5,"ParJobCount":0,"PostJobCount":0,"UrlCount":0,"UpTimeSec":2348634,"DownloadTimeSec":49342,"ServerPaused":false,"DownloadPaused":false,"Download2Paused":false,"ServerStandBy":true,"PostPaused":false,"ScanPaused":false,"FreeDiskSpaceLo":127795200,"FreeDiskSpaceHi":2057,"FreeDiskSpaceMB":8425593,"ServerTime":1384806423,"ResumeTime":0}}

	//new Element('div', {text: JSON.stringify(result)}).inject(document.body);

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
			t = new Element('tr').inject($('history_cont'));
			new Element('td', {text:litem.status, class:'tag '+litem.status}).inject(t);
			new Element('td', {text:litem.Name}).inject(t);
			new Element('td', {text:Number(litem.HistoryTime*1000).formatTimeDiff()}).inject(t);
			new Element('td', {text:formatSizeMB(litem.FileSizeMB, litem.FileSizeLo), class:'r'}).inject(t);
		}
	});
/*
[{ActiveDownloads: 20
,Category: ""
,DestDir: "/share/download/nzbget/incomplete/Grimm.S03E04.720p.WEB-DL.DD5.1.H.264-ECI"
,FileCount: 40
,FileSizeHi: 0
,FileSizeLo: 1713291183
,FileSizeMB: 1633
,FirstID: 14905
,LastID: 14943
,MaxPostTime: 1384801891
,MaxPriority: 0
,MinPostTime: 1384801830
,MinPriority: 0
,NZBFilename: "Grimm.S03E04.720p.WEB-DL.DD5.1.H.264-ECI.nzb"
,NZBID: 453
,NZBName: "Grimm.S03E04.720p.WEB-DL.DD5.1.H.264-ECI"
,NZBNicename: "Grimm.S03E04.720p.WEB-DL.DD5.1.H.264-ECI"
,Parameters: Array[0]
,PausedSizeHi: 0
,PausedSizeLo: 290588216
,PausedSizeMB: 277
,RemainingFileCount: 36
,RemainingParCount: 8
,RemainingSizeHi: 0
,RemainingSizeLo: 1462779847
,RemainingSizeMB: 1395}]
*/
});