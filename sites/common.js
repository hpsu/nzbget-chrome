/**
 * Loop through an elements parents until we find one that matches
 * <type> or return null
 *
 * @param  {element} el Element
 * @param  {string}  type Type expected of parent element
 * @return {element} Found parent or null
 */
function findParentOfType(el, type){
    'use strict';
    var par = el;
    while(par !== null) {
        if(par.tagName === type) {
            return par;
        }
        par = par.parentElement;
    }
    return null;
}

/**
 * Create an IMG-element with properties and events
 * ready to inject into a sites markup.
 *
 * @param  {string}  id           Unique identifier
 * @param  {string}  href         URL
 * @param  {string}  cat          Category
 * @param  {string}  nameOverride Override NZB-name provided in header
 * @return {element} Ready constructed element
 */
function createNgIcon(id, href, cat, nameOverride){
    'use strict';
    var eNgIcon = document.createElement('img'),
        eNgContainer = document.createElement('a');
    eNgIcon.src = chrome.extension.getURL('img/nzbget-arrow.svg');
    eNgContainer.title = 'Click to download with NZBGet.';
    eNgIcon.className = 'nzbgc_download';

    eNgContainer.href = href;
    eNgIcon.href = href;
    eNgIcon.id = id;
    eNgIcon.nameOverride = nameOverride;
    eNgIcon.category = cat;

    eNgIcon.addEventListener('click', function(e) {
        e.preventDefault();

        chrome.runtime.sendMessage({
            message: 'addURL',
            href: this.href,
            id: this.id,
            category: this.category,
            nameOverride: this.nameOverride
        });

        this.classList.add('nzbgc_adding');

        return false;
    });

    // Check for match in stored URLs
    chrome.runtime.sendMessage(
        {message: 'checkCachedURL', url: href},
        function(response) {
            if(response) {
                document.getElementById(id).classList.add('nzbgc_added_ok');
            }
        }
    );
    eNgContainer.appendChild(eNgIcon);
    return eNgContainer;
}

/**
 * Listen to events sent to the tab. Update icon class to reflect add status
 *
 * @TODO:  Implement fail status
 * @param  {object}  m Message object
 * @return {bool}    success
 */
chrome.runtime.onMessage.addListener(function(m) {
    'use strict';
    switch(m.message) {
        case 'addedurl':
            var eInject = document.getElementById(m.id);
            if(!eInject) {
                return false;
            }
            eInject.classList.remove('nzbgc_adding');
            if(m.status) {
                eInject.classList.add('nzbgc_added_ok');
            }
        break;
    }
    return true;
});
