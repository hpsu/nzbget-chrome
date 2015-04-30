/**
 * Inject nzbgc-markup to binsearch.info
 */

var dllinks = document.querySelectorAll('input[type=checkbox]'),
	linkref = window.location.href.replace(/^.+\?/,'').split('&'),
	baselink = 'http://www.binsearch.info/?action=nzb';

var get = {};
for(var i in linkref) {
	var part = linkref[i].split('=');
	get[part[0]] = part.length > 1 ? part[1] : '';
}
if(get.b && get.g) {
	baselink += '&b='+get.b+'&g='+get.g;
}

for(var i=0; i < dllinks.length; i++) {
	var dlitem = dllinks.item(i)
		,lid = dlitem.name
		,newSpan = document.createElement('span')
		,trParent = findParentOfType(dlitem, 'TR')
		,nameTag = trParent.querySelector('span.s')
		,name = ''
	;

	if(!nameTag)
		nameTag = trParent.querySelectorAll('td')[1]

	if(nameTag) {
		name = nameTag.childNodes[0].textContent.replace(/\[[0-9]+\/[0-9]+\]\s*-\s*/g,'').replace(/\s*\([0-9]+\/[0-9]+\)/g, '').replace(/"/g,'').replace(/\s*yEnc\s*/, '').replace(/\//g,'')
	}

	newSpan.className = 'icon_nzbgc';
	newSpan.style.padding = '0 5px';

	var newitem = createNgIcon(
		lid+'_nzbgc',
		baselink + '&' + dlitem.name + '=1',
		'',
		name
	);

	newSpan.appendChild(newitem);

	dlitem.parentElement.insertBefore(newSpan,dlitem);
}
