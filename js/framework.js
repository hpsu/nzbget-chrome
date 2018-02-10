function $E(params) {
    'use strict';
    var tmp = document.createElement(params.tag);
    if(params.className) {
        tmp.className = params.className;
    }
    if(params.text) {
        tmp.appendChild(document.createTextNode(params.text));
    }
    if(params.styles) {
        for(var k in params.styles) {
            tmp.style[k] = params.styles[k];
        }
    }
    if(params.rel) {
        tmp.setAttribute('rel', params.rel);
    }
    return tmp;
}

function modalDialog(header, body, buttons) {
    'use strict';
    const
        shroud = document.querySelector('.shroud'),
        btnbar = shroud.querySelector('.btnbar');

    shroud.querySelector('h2').innerHTML = header;
    shroud.querySelector('p').innerHTML = body;
    btnbar.innerHTML = '';

    const clickFunc = function() {
        if(this.clickfunc) {
            this.clickfunc();
        }
        shroud.classList.remove('active');
    };

    for(let button of buttons) {
        let btnElm = $E({
            tag: 'a',
            text: button.title});
        if(button.href) {
            btnElm.href = button.href;
            btnElm.target = '_blank';
        } else {
            btnElm.href = '#';
        }
        btnElm.clickfunc = button.onClick;

        btnElm.addEventListener('click', clickFunc);
        btnbar.appendChild(btnElm);
    }

    shroud.classList.add('active');
}
