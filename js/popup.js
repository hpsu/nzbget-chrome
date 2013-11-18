Number.implement({
	zeroPad: function() {
		return (this < 10 ? '0' : '') + this;
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

window.addEvent('domready', function(){
	api = chrome.extension.getBackgroundPage().ngAPI;
	opts = api.Options;

	/* Setup variables */
	// {"RemainingSizeLo":0,"RemainingSizeHi":0,"RemainingSizeMB":0,"DownloadedSizeLo":4009763785,"DownloadedSizeHi":52,"DownloadedSizeMB":216816,"DownloadRate":0,"AverageDownloadRate":4607597,"DownloadLimit":0,"ThreadCount":5,"ParJobCount":0,"PostJobCount":0,"UrlCount":0,"UpTimeSec":2348634,"DownloadTimeSec":49342,"ServerPaused":false,"DownloadPaused":false,"Download2Paused":false,"ServerStandBy":true,"PostPaused":false,"ScanPaused":false,"FreeDiskSpaceLo":127795200,"FreeDiskSpaceHi":2057,"FreeDiskSpaceMB":8425593,"ServerTime":1384806423,"ResumeTime":0}}
	var result = api.status().result;
	new Element('div', {text: formatSizeMB(Number(result.RemainingSizeMB), Number(result.RemainingSizeLo))}).inject(document.body);
	new Element('div', {text: (result.DownloadRate / 1024).round(2) + ' KB/s'}).inject(document.body);

	//new Element('div', {text: JSON.stringify(result)}).inject(document.body);

	
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

	})
});