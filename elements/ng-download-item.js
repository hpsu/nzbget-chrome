'use strict';

class NgDownloadItem extends NgElement {

    constructor(ob) {
        super(ob);
        this._setup();
    }

    _createMarkup() {
        this._elements.root.appendChild(
            this.$element('div', 'info', [
                this.$element('div', 'title'),
                this.$element('div', 'postinfo'),
                this.$element('div', 'progress_bar', [
                    this.$element('div', 'barpct', {
                        class: 'progress_piece'}),
                    this.$element('div', 'barPaused', {
                        class: 'progress_piece paused'})
                ]),
                this.$element('div', 'bottom_box', [
                    this.$element('div', 'text'),
                    this.$element('span', 'healthWarning'),
                    this.$element('span', 'categoryBadge', {
                        class:'categoryBadge ripple'}),
                    this.$element('div', 'categoryContext', [
                        this.$element('ul')
                    ], {class: 'contextmenu'})
                ])
            ])
        );

        this._elements.root.appendChild(
            this.$element('i', 'moreVert', {
                class: 'material-icons menu ripple', text: 'more_vert'})
        );

        this._elements.root.appendChild(
            this.$element('div', 'contextmenu', [
                this.$element('ul', 'ccont', [
                    this.$element('li', 'btn_pause', [
                        this.$element('i', 'pauseI', {
                            class: 'material-icons', text: 'pause'}),
                        this.$element('span', 'pauseSpan')
                    ]),
                    this.$element('li', 'btn_delete', [
                        this.$element('i', 'deleteI', {
                            class: 'material-icons', text: 'delete'}),
                        this.$element('span', 'deleteSpan', {
                            text: 'Delete'
                        })
                    ]),
                    this.$element('li', 'btn_move_top', [
                        this.$element('i', 'moveTopI', {
                            class: 'material-icons',
                            text: 'vertical_align_top'}),
                        this.$element('span', 'moveTopSpan', {
                            text: 'Move to top'
                        })
                    ]),
                    this.$element('li', 'btn_move_bottom', [
                        this.$element('i', 'moveBottomI', {
                            class: 'material-icons',
                            text: 'vertical_align_bottom'}),
                        this.$element('span', 'moveBottomSpan', {
                            text: 'Move to bottom'
                        })
                    ])
                ])
            ])
        );
    }

    _stringRound(input, precision) {
        var multiplier = Math.pow(10, precision),
            roundedInput = Math.round(input * multiplier) / multiplier,
            stringParts = String(roundedInput).split('.');

        if(stringParts.length < 2) {
            stringParts[1] = '';
        }

        if(stringParts[1].length !== precision) {
            stringParts[1] += '0'.repeat(precision - stringParts[1].length);
        }

        return stringParts.join('.');
    }

    _setupRipple(element) {
        element.addEventListener('mousedown', (e) => {
            const
                bounds = element.getBoundingClientRect(),
                x = e.pageX - bounds.left,
                y = e.pageY - bounds.top;

            element.style.setProperty('--ripple-left', x);
            element.style.setProperty('--ripple-top', y);
            element.classList.add('animate');
            element.mouseDown = true;
            element.isAnimating = true;
        });
        element.addEventListener('mouseup', () => {
            if(!element.isAnimating) {
                element.classList.remove('animate');
            }
            element.mouseDown = false;
        });

        element.addEventListener('mouseout', () => {
            element.mouseDown = false;
            element.isAnimating = false;
            element.classList.remove('animate');
        });

        element.addEventListener('animationend', () => {
            element.isAnimating = false;
            if(!element.mouseDown) {
                element.classList.remove('animate');
            }
        });
    }

    _editQueue(method) {
        window.ngAPI.sendMessage(
            'editqueue',
            [method, 0, '', [this._item.NZBID]],
            function() {});
    }

    _setupContextEvents() {
        this._elements.btn_pause.addEventListener('mousedown', () => {
            const method = this._item.Status === 'PAUSED' ?
                'GroupResume' :
                'GroupPause';
            this._editQueue(method);
        });

        this._elements.btn_delete.addEventListener('mousedown', () => {
            if(confirm('Are you sure?')) {
                this._editQueue('GroupDelete');
            }
        });

        this._elements.btn_move_top.addEventListener(
            'mousedown', () => this.__editQueue('GroupMoveTop')
        );

        this._elements.btn_move_bottom.addEventListener(
            'mousedown', () => this.__editQueue('GroupMoveBottom')
        );

        this._elements.moreVert.addEventListener('mouseup', () => {
            const label =
                this._item.Status === 'PAUSED' ?
                    'Resume' :
                    'Pause';
            this._elements.contextmenu.classList.toggle('show');
            this._elements.pauseSpan.innerText = label;
        });
    }

    _createCategoryItem(itemText, id) {
        const item = this.$element('li', id, {text: itemText});

        item.setAttribute('data-category', id);
        item.addEventListener('mousedown', (e) => {
            window.ngAPI.setGroupCategory(
                this._item.NZBID,
                e.currentTarget.getAttribute('data-category'));
        });
        return item;
    }

    _setupCategoryMenu() {
        const categories = JSON.parse(ngAPI.Options.get('opt_categories'));
        const menu = this._elements.categoryContext.querySelector('ul');

        menu.appendChild(this._createCategoryItem(
            'No category', ''
        ));
        for(var category in categories) {
            menu.appendChild(this._createCategoryItem(
                categories[category],
                categories[category]
            ));
        }

        this._elements.categoryBadge.addEventListener('click', () => {
            this._elements.categoryContext.classList.toggle('show');
        });
    }

    _setProgress() {
        const progressChanged =
            this._updateProp('FileSizeHi') |
            this._updateProp('FileSizeLo') |
            this._updateProp('RemainingSizeHi') |
            this._updateProp('RemainingSizeLo') |
            this._updateProp('PausedSizeHi') |
            this._updateProp('PausedSizeLo') |
            this._updateProp('Status') |
            this._updateProp('ActiveDownloads');

        const postChanged =
            this._updateProp('PostStageProgress') |
            this._updateProp('PostInfoText');

        if(!progressChanged && !postChanged) {
            return;
        }

        let
            fileSize = window.ngAPI.parse.bigNumber(
                this._item.FileSizeHi,
                this._item.FileSizeLo),

            remainingSize = window.ngAPI.parse.bigNumber(
                this._item.RemainingSizeHi,
                this._item.RemainingSizeLo),

            pausedSize = window.ngAPI.parse.bigNumber(
                this._item.PausedSizeHi,
                this._item.PausedSizeLo),

            progressPercent = (fileSize - remainingSize) / fileSize * 100,
            pausedPercent = pausedSize / fileSize * 100,
            isPostProcessing = this._item.PostInfoText !== 'NONE';

        if(isPostProcessing && postChanged) {
            /* Post process info */
            progressPercent = this._item.PostStageProgress / 10;
            pausedPercent = 0;

            const postInfo = this._item.PostInfoText
                .replace(/_/g, ' ')
                .replace(/([.\/\\-])/g, '$1<wbr>');
            this._elements.postinfo.innerHTML = postInfo;
        }

        let statusText =
            this._stringRound(progressPercent, 1) +
            '% of ' +
            window.ngAPI.parse.toHRDataSize(fileSize);

        let statusTag = 'none';

        if(this._item.Status !== 'DOWNLOADING') {
            statusText += ', ' + this._item.Status.toLowerCase();
        }
        if(this._item.estRem && !isPostProcessing) {
            statusText += ' (~' + this._item.estRem + ' left)';
        }

        if(['DOWNLOADING', 'PAUSED'].indexOf(this._item.Status) > -1) {
            statusTag = this._item.Status.toLowerCase();
        }
        if(isPostProcessing) {
            statusTag = 'postprocess';
            if(window.ngAPI.status.PostPaused) {
                statusTag = 'paused';
            }
        }

        this._elements.barpct.style.width =
            progressPercent + '%';
        this._elements.barPaused.style.width =
            pausedPercent + '%';
        this._elements.progress_bar.className =
            'progress_bar ' + statusTag;

        this._elements.text.innerText = statusText;
    }

    _updateProp(prop) {
        if(this._props[prop] === this._item[prop]) {
            return false;
        }
        this._props[prop] = this._item[prop];
        return true;
    }

    _setName() {
        if(!this._updateProp('NZBName')) return;

        // this._elements.title.style.animationName = 'pulse';
        // this._elements.title.classList.add('animate');
        this._elements.title.innerHTML = this._item.NZBName
            .replace(/_/g, ' ')
            .replace(/([.\/\\-])/g, '$1<wbr>');
    }

    _setCategory() {
        if(!this._updateProp('Category')) return;

        if(this._item.Category) {
            this._elements.categoryBadge.innerText = this._item.Category;
            this._elements.categoryBadge.classList.remove('add');
        } else {
            this._elements.categoryBadge.innerText = 'No category';
            this._elements.categoryBadge.classList.add('add');
        }

        this._elements.categoryBadge.classList.add('animate');
    }

    _setHealth() {
        if(!this._updateProp('Health')) return;

        let health = 100;
        if(this._item.Health < 1000) {
            health = Math.floor(this._item.Health / 10);
        }

        if(health < 100) {
            this._elements.healthWarning.innerText = health + '%' + ' health';
            this._elements.healthWarning.classList.add('active');
        } else {
            this._elements.healthWarning.innerText = '';
            this._elements.healthWarning.classList.remove('active');
        }
    }

    _refresh() {
        this._setName();
        this._setCategory();
        this._setHealth();
        this._setProgress();
    }

    _setup() {
        this._createMarkup();

        this._setupRipple(this._elements.moreVert);
        this._setupRipple(this._elements.categoryBadge);

        this._setupContextEvents();
        this._setupCategoryMenu();

        this._elements.root.cls = this;
        this._props = {};
        this._item = this._elements.root.item;

        this._elements.root.refresh = () => this._refresh();
    }
}
