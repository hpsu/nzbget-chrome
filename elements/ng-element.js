'use strict';

class NgElement {
    constructor(ob) {
        this._elements = {
            root: ob
        };
    }

    $element(tag, id, children, params) {
        if(!id) {
            id = tag;
        }

        if(!Array.isArray(children)) {
            params = children;
            children = [];
        }
        this._elements[id] = document.createElement(tag);
        this._elements[id].className = params && params.class || id;
        for(var child in children) {
            this._elements[id].appendChild(children[child]);
        }
        if(params && params.text) {
            this._elements[id].appendChild(
                document.createTextNode(params.text));
        }
        return this._elements[id];
    }
}
