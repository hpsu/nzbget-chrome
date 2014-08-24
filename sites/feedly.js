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

		var eRoot = dlitem.parentElement.parentElement.parentElement
			,eParent = eRoot.querySelector('.shareHolder .left')
			,eBody = eRoot.querySelector('.entryBody');

		newitem = createNgIcon(
			eRoot.id.replace('_entryHolder','_nzbgc'), 
			dlitem.href, 
			eBody.innerText.match(/Category[\s-:]*(.+)/)[1]
		);
		newitem.classList.add('headerInfo-expanded-img');

		eParent.insertBefore(newitem,eParent.firstChild);
	}
}

function DOMModificationHandler(attr){
	if(timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(DOMModificationCallback, 200);
};

window.addEventListener('DOMSubtreeModified', DOMModificationHandler, false);

