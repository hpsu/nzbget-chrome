function $(o) {
    return document.getElementById(o);
};
function $E(params) {
    var tmp = document.createElement(params.tag);
    if(params.className) tmp.className = params.className;
    if(params.text) tmp.appendChild(document.createTextNode(params.text));
    if(params.styles) for(k in params.styles) {
        tmp.style[k] = params.styles[k];
    }
    if(params.rel) tmp.setAttribute('rel', params.rel);
    return tmp;
};
