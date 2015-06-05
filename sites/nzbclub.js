/**
 * Inject nzbgc-markup to nzbclub.com
 */
(function() {
    'use strict';
    var containers = document.querySelectorAll(
        '.row .project-action[collectionid]:first-child');
    for(var i = 0; i < containers.length; i++) {
        var container = containers.item(i);
        var lid = container.getAttribute('collectionid');
        var resultaction = container.querySelector('div');
        var newdiv = document.createElement('button');

        newdiv.className = 'btn btn-xs icon_nzbgc';
        //newdiv.style.padding = '0 5px';

        var newitem = createNgIcon(
            lid + '_nzbgc',
            window.location.protocol +
                '//' + window.location.host + '/nzb_get/' + lid
        );
        newitem.style.marginTop = '0';
        newitem.style.marginBottom = '0';
        newitem.style.width = 'auto';
        newitem.style.height = '11px';
        newitem.style.borderRadius = '0';

        newdiv.appendChild(newitem);

        resultaction.appendChild(newdiv);
    }
})();
