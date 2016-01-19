var owner = document.currentScript.ownerDocument;
var CBProto = Object.create(HTMLElement.prototype);

CBProto.createdCallback = function() {
    'use strict';
    var shadowRoot = this.createShadowRoot(),
        template = owner.querySelector('template'),
        clone = document.importNode(template.content, true);

    shadowRoot.appendChild(clone);

    // Events
    this.toggle = function() {
        this.checked = !this.checked;
    };
    this.onclick = this.toggle;
    this.onkeydown = function(e) {
        if(e.keyCode === 32) {
            this.toggle();
        }
    };
    Object.defineProperty(this, 'checked', {
        get: function() {return this._checked;},
        set: function(newValue) {
            this.checkboxElement.className = newValue ? 'checked' : '';
            this._checked = newValue;
        }
    });
    Object.defineProperty(this, 'value', {
        get: function() {return this._checked;},
        set: function(newValue) {
            this.checked = newValue;
        }
    });
    Object.defineProperty(this, 'label', {
        get: function() {return this.value;},
        set: function(newValue) {
            this.labelElement.textContent = newValue;
        }
    });
    Object.defineProperty(this, 'description', {
        set: function(newValue) {
            this.descriptionElement.textContent = newValue;
        }
    });

    // Shadow elements
    this.labelElement = shadowRoot.querySelector('header');
    this.descriptionElement = shadowRoot.querySelector('description');
    this.checkboxElement = shadowRoot.querySelector('checkbox');

    // Initial value setup
    this.tabIndex = 0;
    this.label = this.getAttribute('label');
    this.description = this.getAttribute('description');
    this.checked = this.checked === true;
};

CBProto.attributeChangedCallback = function(attr, oldVal, newVal) {
    'use strict';
    switch(attr) {
        case 'label':
            this.label = newVal;
            break;
        case 'description':
            this.description = newVal;
            break;
    }
};

document.registerElement('ng-checkbox', {prototype: CBProto});
