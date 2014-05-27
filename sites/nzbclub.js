/**
 * Inject nzbgc-markup to nzbclub.com
 */

dllinks = document.querySelectorAll('a[href*=\"/nzb_get/\"]');
for(var i=0; i < dllinks.length; i++) { 
	var dlitem = dllinks.item(i);
	var category = '', lid = '';
	
	newdiv = document.createElement('span');
	newdiv.className = 'icon_nzbget';
	newdiv.style.padding = '0 5px';
	var trParent = findParentOfType(dlitem, 'TR');
	if(trParent && trParent.id) lid = trParent.id;

	newitem = createNgIcon(
		lid+'_nzbgc',
		dlitem.href, 
		category
	);

	newdiv.appendChild(newitem);

	var dlparent = dlitem.parentElement;
	dlparent.parentElement.insertBefore(newdiv,dlparent);
}