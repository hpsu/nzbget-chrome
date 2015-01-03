var owner = document.currentScript.ownerDocument;
var CBProto = Object.create(HTMLElement.prototype);

CBProto.createdCallback = function() {
    var shadowRoot = this.createShadowRoot()
        ,template = owner.querySelector('template')
        ,clone = document.importNode(template.content, true);

    shadowRoot.appendChild(clone);

    // Events
    this.toggle = function() {
        this.checked = !this.checked;
    };
    this.onclick = this.toggle;
    this.onkeydown = function(e) {
        if(e.keyCode == 32) this.toggle();
    };
    Object.observe(this, function(changes) {
        for(var i in changes) {
            switch(changes[i].name) {
                case 'checked':
                    changes[i].object.checkboxElement.className
                        = changes[i].object.checked ? 'checked' : '';
                    break;
                case 'label':
                    changes[i].object.labelElement.textContent
                        = changes[i].object.label;
                    break;
                case 'description':
                    changes[i].object.descriptionElement.textContent
                        = changes[i].object.description;
                    break;
                }
        }
    });

    // Shadow elements
    this.labelElement = shadowRoot.querySelector('header');
    this.descriptionElement = shadowRoot.querySelector('description');
    this.checkboxElement = shadowRoot.querySelector('checkbox');

    // Initial value setup
    this.tabIndex=0;
    this.label = this.getAttribute('label');
    this.description = this.getAttribute('description');
    this.checked = this.value == true;

    Object.defineProperty(this, 'value', {
        get: function() {
            return this.checked;
        },
        set: function(v) {
            this.checked = v == true;
        }
    });
};

CBProto.attributeChangedCallback = function(attr, oldVal, newVal) {
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
