'use strict';

class NgCheckBox extends NgElement {

    constructor(ob) {
        super(ob);
        this._setup();
    }

    get checked() {
        return this._elements.root.getAttribute('checked') !== null;
    }

    set checked(value) {
        if(value) {
            this._elements.root.setAttribute('checked', '');
        }
        else {
            this._elements.root.removeAttribute('checked');
        }
    }

    _sync() {
        this._elements.heading.innerText =
            this._elements.root.getAttribute('label');
        this._elements.root.label =
            this._elements.root.getAttribute('label');
        this._elements.description.innerText =
            this._elements.root.getAttribute('description');
        this._elements.root.checked = this.checked;
    }

    _setup() {
        Object.defineProperty(this._elements.root, 'value', {
            get: () => {
                return this.checked;
            },
            set: (value) => {
                this.checked = value;
            }
        });
        var observer = new MutationObserver(() => {
            this._sync();
        });
        observer.observe(this._elements.root, {attributes: true});
        this._elements.root.addEventListener('click', () => {
            this.checked = !this.checked;
        });

        this._elements.root.appendChild(
            this.$element('label', 'label', [
                this.$element('div', 'checkboxContainer', [
                    this.$element('div', 'checkbox')
                ]),
                this.$element('div', 'textContainer', [
                    this.$element('header', 'heading'),
                    this.$element('description')
                ])
            ])
        );
        this._sync();
    }
}

var list = document.querySelectorAll('ng-checkbox');
list.forEach(function(ob) {
    new NgCheckBox(ob);
});
