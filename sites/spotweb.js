/**
 * Run when a site matching spotweb-markup is found
 */
(function(){
    'use strict';
    var timeout = null;
    var leap = 0;
    /**
     * DOMModificationCallback
     * Called after the last DOMSubtreeModified event in a chain.
     * @return {void}
     */
    function domModificationCallback() {
        var dllinks = document.querySelectorAll('a[title*="Download NZB"');
        for(var i = 0; i < dllinks.length; i++) {
            var dlitem = dllinks.item(i);

            // Skip if already processed
            if(dlitem.nzbGetProcessed) {
                continue;
            }
            dlitem.nzbGetProcessed = true;

            var eParent = dlitem.parentElement;

            var newitem = createNgIcon(
                leap++ + '_nzbgc',
                dlitem.href,
                ''
            );

            eParent.insertBefore(newitem, dlitem);
        }
    }

    function domModificationHandler(){
        if(timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(domModificationCallback, 200);
    }

    window.addEventListener(
        'DOMSubtreeModified',
        domModificationHandler,
        false);
    domModificationCallback();
})();
