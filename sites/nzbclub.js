/**
 * Inject nzbgc-markup to nzbclub.com
 */

var dllinks = document.querySelectorAll('a[href*="/nzb_get/"]');
for(var i = 0; i < dllinks.length; i++) {
    var dlitem = dllinks.item(i);
    var category = '', lid = '';
    var newdiv = document.createElement('span');
    var trParent = findParentOfType(dlitem, 'TR');

    newdiv.className = 'icon_nzbgc';
    newdiv.style.padding = '0 5px';

    if(trParent && trParent.id) {
        lid = trParent.id;
    }

    var newitem = createNgIcon(
        lid + '_nzbgc',
        dlitem.href,
        category
    );

    newdiv.appendChild(newitem);

    var dlparent = dlitem.parentElement;
    dlparent.parentElement.insertBefore(newdiv, dlparent);
}
