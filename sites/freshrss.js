(function(){
    'use strict';
    var timeout = null;

    /**
     * DOMModificationCallback
     * Called after the last DOMSubtreeModified event in a chain.
     *
     * @return {void}
     */
    function DOMModificationCallback() {
        var dllinks = document.querySelectorAll('div.flux li.item.title a');
        for(var i = 0; i < dllinks.length; i++) {
            var dlitem = dllinks.item(i);

            // Skip if already processed or if href="" doesn't contain '.nzb'
            if(dlitem.nzbGetProcessed || !dlitem.href.match(/\.nzb/)) {
                continue;
            }
            dlitem.nzbGetProcessed = true;

            var eParent = dlitem.parentElement;
            var eRoot = findParentOfType(eParent, 'DIV');
            var eContent = eRoot.querySelector('DIV.flux_content');
            var eTarget = eContent.querySelector('H1');
            var eBody = eTarget.nextElementSibling;
            var catMatch = eBody.innerHTML.replace(/<(?:.|\n)*?>/gm, '\n')
                .match(/Category[\s-:]*([^\n]+)/);
            var category = catMatch && catMatch.length ? catMatch[1] : '';
            var newItem = createNgIcon(
                eRoot.id + ' _nzbgc',
                dlitem.href,
                category
            );
            newItem.style.marginRight = '10px';
            newItem.style.marginTop = '10px';
            newItem.firstChild.style.width = '22px';
            newItem.style.float = 'left';
            newItem.style.lineHeight = '1';
            newItem.style.display = 'inline-block';
            eTarget.insertBefore(newItem, eTarget.firstChild);
        }
    }

    function DOMModificationHandler(){
        if(timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(DOMModificationCallback, 200);
    }

    window.addEventListener(
        'DOMSubtreeModified',
        DOMModificationHandler,
        false);
})();