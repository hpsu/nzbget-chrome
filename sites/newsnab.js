/**
 * Run when a site matching newznab-markup is found
 */

dllinks = document.querySelectorAll('div.icon_nzb a[href*=\"/getnzb\"]');
for(var i=0; i < dllinks.length; i++) {
	var dlitem = dllinks.item(i);
	var category = '', lid = '';

	newdiv = document.createElement('div');
	newdiv.className = 'icon icon_nzbget';

	// Try to find category and an unique id
	var tabParent = document.getElementById('details');
	if(!tabParent) tabParent = document.getElementById('detailstable');

	var trParent = findParentOfType(dlitem, 'TR');
	if(trParent.id) lid = trParent.id;

	if(tabParent) { // Details page
		var tdCat = tabParent.querySelector('td a[href*="/browse?t"]');
		if(tdCat) {
			category = tdCat.innerText;
		}
	}
	else { // Assume listing page
		var tdCat = trParent.querySelector('td:nth-child(3)');
		if(tdCat) {
			category = tdCat.innerText;
		}
	}

	newitem = createNgIcon(
		lid+'_nzbgc',
		dlitem.href,
		category
	);

	newdiv.appendChild(newitem);

	var dlparent = dlitem.parentElement;
	dlparent.parentElement.insertBefore(newdiv,dlparent);
}
