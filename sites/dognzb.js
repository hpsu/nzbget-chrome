/**
 * Inject nzbgc-markup to dognzb.cr
 */
(function() {
    'use strict';
    function injectBrowsingMode() {
        var dllinks = document.querySelectorAll('div.dog-icon-download');
        for(var i = 0; i < dllinks.length; i++) {
            var dlitem = dllinks.item(i);
            var category = '', lid = '';

            // create the element we want to insert into the html
            var newtd = document.createElement('td');
            newtd.className = 'icon_nzbgc';
            newtd.style.padding = '0 2px';
            var trParent = findParentOfType(dlitem, 'TR');
            if(trParent && trParent.id) {
                lid = trParent.id;
            }

            // read the nzb id from the onclick attribute
            var nzbid = dlitem.getAttribute('onclick');
            nzbid = nzbid.split('\'')[1];

            // we need the personal token to assemble the download link below
            var rssToken = document.getElementsByName('rsstoken')[0].value;

            // create the nzbget icon and assemble the download link
            var newitem = createNgIcon(
                lid + '_nzbgc',
                'https://dognzb.cr' + '/fetch/' + nzbid + '/' + rssToken,
                category
            );

            newtd.appendChild(newitem);

            var dlparent = dlitem.parentElement;
            dlparent.parentElement.insertBefore(newtd, dlparent);
        }

        var warnings = document.querySelectorAll('div.dog-icon-warning');
        for (var j = 0; j < warnings.length; j++) {
            var warningitem = warnings.item(j);

            // we add an empty td to preserve the layout
            var tdParent = document.createElement('td');
            var warningparent = warningitem.parentElement;
            warningparent.parentElement.insertBefore(tdParent, warningparent);
        }
    }
    function injectDetailsMode() {
        var dllinks = document.querySelectorAll('i.icon-download');
        for(var i = 0; i < dllinks.length; i++) {
            var dlitem = dllinks.item(i);
            var category = '', lid = 'details';

            // create the new hirarchy for the modified download menu
            var newtr = document.createElement('tr');
            var newtdpadding = document.createElement('td');
            newtdpadding.width = '4';
            var newtd1 = document.createElement('td');
            var newtd2 = document.createElement('td');

            // read the nzb id from the onclick attribute
            var nzbid = dlitem.parentNode.getAttribute('onclick');
            nzbid = nzbid.split("'")[1];

            // we need the personal token to assemble the download link below
            var rssToken = document.getElementsByName('rsstoken')[0].value;

            // create the nzbget icon and assemble the download link
            var newitem = createNgIcon(
                lid + '_nzbgc',
                'https://dognzb.cr' + '/fetch/' + nzbid + '/' + rssToken,
                category
            );

            // assemble the modified download menu hirarchy
            newtd1.appendChild(newitem);
            newtd2.appendChild(dlitem.parentNode);
            newtr.appendChild(newtdpadding);
            newtr.appendChild(newtd1);
            newtr.appendChild(newtd2);

            document.getElementsByClassName('multiple')[0].appendChild(newtr);
        }
    }
    if(document.querySelector('title').text.match(/Browse/)) {
        injectBrowsingMode();
    } else {
        injectDetailsMode();
    }
})();
