/**
 * Run when a site matching spotweb-markup is found
 */

var timeout = null;
var leap = 0;
/**
 * DOMModificationCallback - Called after the last DOMSubtreeModified event in a chain.
 */

function DOMModificationCallback() {
	dllinks = document.querySelectorAll('a[title*="Download NZB"');
	for(var i=0; i < dllinks.length; i++) {
		var dlitem = dllinks.item(i);

		// Skip if already processed
		if(dlitem.nzbGetProcessed) continue;
		dlitem.nzbGetProcessed = true;

		var eParent = dlitem.parentElement;

		newitem = createNgIcon(
			(leap++)+'_nzbgc',
			dlitem.href,
			''
		);

		eParent.insertBefore(newitem,dlitem);
	}
}

function DOMModificationHandler(attr){
	if(timeout) {
		clearTimeout(timeout);
	}
	timeout = setTimeout(DOMModificationCallback, 200);
};

window.addEventListener('DOMSubtreeModified', DOMModificationHandler, false);
DOMModificationCallback();
