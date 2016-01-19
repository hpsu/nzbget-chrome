/**
 * Run when a site matching newznab-markup is found
 */

(function(){
    'use strict';
    var dllinks = document.querySelectorAll('div.icon_nzb a[href*="/getnzb"]');
    for(var i = 0; i < dllinks.length; i++) {
        var dlitem = dllinks.item(i),
            category = '',
            lid = '',
            newdiv = document.createElement('div'),
            tabParent = document.getElementById('details'),
            trParent = findParentOfType(dlitem, 'TR'),
            dlparent = dlitem.parentElement,
            tdCat = '';

        // Skip if already processed
        if(dlitem.nzbGetProcessed) {
            continue;
        }
        dlitem.nzbGetProcessed = true;

        newdiv.className = 'icon icon_nzbgc';

        // Try to find category and an unique id
        if(!tabParent) {
            tabParent = document.getElementById('detailstable');
        }

        if(trParent.id) {
            lid = trParent.id;
        }

        if(tabParent) { // Details page
            tdCat = tabParent.querySelector('td a[href*="/browse?t"]');
            if(tdCat) {
                category = tdCat.innerText;
            }
        }
        else { // Assume listing page
            tdCat = trParent.querySelector('td:nth-child(3)');
            if(tdCat) {
                category = tdCat.innerText;
            }
        }

        var newitem = createNgIcon(
            lid + '_nzbgc',
            dlitem.href,
            category
        );

        newdiv.appendChild(newitem);
        dlparent.parentElement.insertBefore(newdiv, dlparent);
    }
})();
