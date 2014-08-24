/**
 * Inject nzbgc-markup to nzbindex.nl
 */

dllinks = document.querySelectorAll('a[href*=\"/download/\"]');
for(var i=0; i < dllinks.length; i++) { 
	var dlitem = dllinks.item(i);
	var category = '', lid = '';
	
	var trParent = findParentOfType(dlitem, 'TR');
	if(trParent) {
		var chb = trParent.querySelector('TD INPUT[type=checkbox]');
		if(chb && chb.value) lid = chb.value;
	}

	newitem = createNgIcon(
		lid+'_nzbgc',
		dlitem.href, 
		category
	);

	newitem.style.verticalAlign='middle';
	newitem.style.paddingRight='4px';

	var dlparent = dlitem.parentElement;
	dlparent.insertBefore(newitem,dlitem);
}