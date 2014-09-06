/**
 * Inject nzbgc-markup to dognzb.cr
 */

// check for browsing mode
if (document.getElementsByTagName('title')[0].text.match(/Browse/)) {
    dllinks = document.querySelectorAll('div.dog-icon-download');
    for(var i=0; i < dllinks.length; i++) {
        var dlitem = dllinks.item(i);
        var category = '', lid = '';

        // create the element we want to insert into the html
        newtd = document.createElement('td');
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
        newitem = createNgIcon(
            lid+'_nzbgc',
            'https://dognzb.cr' + '/fetch/' + nzbid + '/' + rss_token,
            category
        );

        newtd.appendChild(newitem);

        var dlparent = dlitem.parentElement;
        dlparent.parentElement.insertBefore(newtd,dlparent);
    }
}

// else use the details mode
else {
    dllinks = document.querySelectorAll('i.icon-download')
    for(var i=0; i < dllinks.length; i++) {
        var dlitem = dllinks.item(i);
        var category = '', lid = 'details';

        // create the elements we want to insert into the html
        newli = document.createElement('li');
        newli.style.height = '22px';
        newli.className = 'listitem_nzbget';

        newa = document.createElement('a');
        newa.style.padding = '0 5px';
        newa.style.cursor = 'pointer';

        // read the nzb id from the onclick attribute
        var nzbid = dlitem.parentNode.getAttribute('onclick');
        nzbid = nzbid.split('\'')[1];

        // we need the personal token to assemble the download link below
        var rss_token = document.getElementsByName("rsstoken")[0].value;

        // create the nzbget icon and assemble the download link
        newitem = createNgIcon(
            lid+'_nzbgc',
            'https://dognzb.cr' + '/fetch/' + nzbid + '/' + rss_token,
            category
        );

        newa.appendChild(newitem);
        newli.appendChild(newa);

        var dlparent = dlitem.parentNode.parentNode.parentNode;
        dlparent.insertBefore(newli,document.getElementsByClassName('multiple')[0]);
    }
}
