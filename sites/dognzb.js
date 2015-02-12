/**
 * Inject nzbgc-markup to dognzb.cr
 */

// check for browsing mode
if (document.getElementsByTagName('title')[0].text.match(/Browse/)) {
    var dllinks = document.querySelectorAll('div.dog-icon-download');
    for(var i=0; i < dllinks.length; i++) {
        var dlitem = dllinks.item(i);
        var category = '', lid = '';

        // create the element we want to insert into the html
        var newtd = document.createElement('td');
        newtd.className = 'icon_nzbget';
        newtd.style.padding = '0 2px';
        var trParent = findParentOfType(dlitem, 'TR');
        if(trParent && trParent.id) lid = trParent.id;

        // read the nzb id from the onclick attribute
        var nzbid = dlitem.getAttribute('onclick');
        nzbid = nzbid.split('\'')[1];

        // we need the personal token to assemble the download link below
        var rss_token = document.getElementsByName("rsstoken")[0].value;

        // create the nzbget icon and assemble the download link
        var newitem = createNgIcon(
            lid+'_nzbgc',
            'https://dognzb.cr' + '/fetch/' + nzbid + '/' + rss_token,
            category
        );

        newtd.appendChild(newitem);

        var dlparent = dlitem.parentElement;
        dlparent.parentElement.insertBefore(newtd,dlparent);
    }

    var warnings = document.querySelectorAll('div.dog-icon-warning');
    for (var i = 0; i < warnings.length; i++) {
        var warningitem = warnings.item(i);

        // we add an empty td to preserve the layout
        var newtd = document.createElement('td');
        var warningparent = warningitem.parentElement;
        warningparent.parentElement.insertBefore(newtd, warningparent);
    }
}

// else use the details mode
else {
    var dllinks = document.querySelectorAll('i.icon-download')
    for(var i=0; i < dllinks.length; i++) {
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
        nzbid = nzbid.split('\'')[1];

        // we need the personal token to assemble the download link below
        var rss_token = document.getElementsByName("rsstoken")[0].value;

        // create the nzbget icon and assemble the download link
        var newitem = createNgIcon(
            lid+'_nzbgc',
            'https://dognzb.cr' + '/fetch/' + nzbid + '/' + rss_token,
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
