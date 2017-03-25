/**
 * Inject nzbgc-markup to newzleech.com
 */
(function() {
    'use strict';
    var dllinks = document.querySelectorAll('a[href*="dl=1"]');

    for(var i = 0; i < dllinks.length; i++) {
        var dlitem = dllinks.item(i),
            lid = '';

        // Skip if already processed
        if(dlitem.nzbGetProcessed) {
            continue;
        }
        dlitem.nzbGetProcessed = true;

        lid = 'ngi' + dlitem.href.match(/post=([0-9]+)/)[1];

        var newitem = createNgIcon(
            lid + '_nzbgc',
            dlitem.href
        );

        dlitem.parentElement.insertBefore(newitem, dlitem);
    }
})();
