var timeout = null;

/**
 * DOMModificationCallback - Called after the last DOMSubtreeModified event in a chain.
 */

function DOMModificationCallback() {
	dllinks = document.querySelectorAll("#timeline A.entryTitle");
	for(var i=0; i < dllinks.length; i++) { 
		var dlitem = dllinks.item(i);

		// Skip if already processed or if href="" doesn't contain the string .nzb
		if(dlitem.nzbGetProcessed || !dlitem.href.match(/\.nzb/)) continue;
		dlitem.nzbGetProcessed = true;

		var eBody = dlitem.parentElement.nextElementSibling;
		var eHead = dlitem.parentElement;
		var eTop = eHead.parentElement.parentElement;
		
		newitem = createNgIcon(
			eTop.id.replace('_entryHolder','_nzbgc'), 
			dlitem.href, 
			eBody.innerText.match(/Category[\s-:]*(.+)/)[1]
		);

		dlitem.parentElement.insertBefore(newitem,dlitem);
	}
}

function DOMModificationHandler(attr){
	if(timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(DOMModificationCallback, 200);
};

window.addEventListener('DOMSubtreeModified', DOMModificationHandler, false);

