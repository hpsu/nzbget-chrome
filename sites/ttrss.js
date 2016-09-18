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
        var noCdm = document.querySelector('.postReply .postTitle A');
        if(noCdm) {
            // Skip if already processed or if href="" doesn't contain '.nzb'
            if(noCdm.nzbGetProcessed || !noCdm.href.match(/\.nzb/)) {
                return;
            }
            noCdm.nzbGetProcessed = true;
            var sRoot = noCdm.parentElement.parentElement.parentElement,
                sBody = sRoot.querySelector('.postContent'),
                sParent = sRoot.querySelector('.postTags'),
                sMatch = sBody.innerText.match(/Category[\s-:]*(.+)/),
                scat = sMatch && sMatch.length ? sMatch[1] : '';
            var sItem = createNgIcon(
                sRoot.id + ' _nzbgc',
                noCdm.href,
                scat
            );
            sItem.style.display = 'inline-block';
            sParent.insertBefore(sItem, sParent.firstChild);
            return;
        }
        var dllinks = document.querySelectorAll('.cdmHeader A.title');
        for(var i = 0; i < dllinks.length; i++) {
            var dlitem = dllinks.item(i);

            // Skip if already processed or if href="" doesn't contain '.nzb'
            if(dlitem.nzbGetProcessed || !dlitem.href.match(/\.nzb/)) {
                continue;
            }
            dlitem.nzbGetProcessed = true;

            var eRoot = dlitem.parentElement.parentElement.parentElement,
                eSibling = eRoot.querySelector('img.tagsPic'),
                eParent = eSibling.parentElement,
                eBody = eRoot.querySelector('.cdmContent .cdmContentInner'),
                catMatch = eBody.innerText.match(/Category[\s-:]*(.+)/),
                category = catMatch && catMatch.length ? catMatch[1] : ''
            var newitem = createNgIcon(
                eRoot.id + ' _nzbgc',
                dlitem.href,
                category
            );
            newitem.classList.add('headerInfo-expanded-img');

            eParent.insertBefore(newitem, eParent.firstChild);
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
