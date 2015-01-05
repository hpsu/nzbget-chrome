/**
 * Inject nzbgc-markup to fanzub.com
 */

dllinks = document.querySelectorAll('a[href*=\"/nzb/\"]');
for(var i=0; i < dllinks.length; i++) {
	var dlitem = dllinks.item(i);
	var category = '', lid = '';

	var trParent = findParentOfType(dlitem, 'TR');
	if(trParent) {
		var chb = trParent.querySelector('TD INPUT[type=checkbox]');
		if(chb && chb.value)
			lid = chb.value;

		var cat = trParent.querySelector('TD A IMG');
		console.log('cat');
		if (cat && cat.alt)
			category = cat.alt;
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
