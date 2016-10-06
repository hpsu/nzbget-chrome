(function(){
    'use strict';
    var owner = document.currentScript.ownerDocument,
        CBProto = Object.create(HTMLElement.prototype),
        api = window.ngAPI,
        parse = api.parse;

    function stringRound(input, precision) {
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

    function parseItem(item) {
        var totalMB = item.FileSizeMB,
            remainingMB = item.RemainingSizeMB,
            percent = (totalMB - remainingMB) / totalMB * 100,
            percentString = stringRound(percent, 1) + '%',
            kind = 'none';
        item.status = parse.groupStatus(item);
        if(item.status === 'downloading' ||
           item.postprocess && !window.ngAPI.status.PostPaused) {
            kind = 'downloading';
        }
        else if(item.status === 'paused' ||
                item.postprocess && window.ngAPI.status.PostPaused) {
            kind = 'paused';
        }
        var postInfo = null;
        if(item.post) {
            percent = item.PostStageProgress / 10;
            postInfo = item.PostInfoText.replace(/_/g, ' ')
                                        .replace(/([.\/\\-])/g, '$1<wbr>');
            kind = 'postprocess';
        }

        var totalSize = parse.toHRDataSize(parse.bigNumber(item.FileSizeHi,
                                                           item.FileSizeLo));
        var statusText = percentString + ' of ' + totalSize;
        if(item.status !== 'downloading') {
            statusText += ', ' + item.status;
        }
        if(item.estRem && !item.post) {
            statusText += ' (~' + item.estRem + ' left)';
        }

        //hwBadge
        var health = 100;
        if(item.Health < 1000 && (!item.postprocess ||
                                  item.status === 'pp-queued' &&
                                  item.post.TotalTimeSec === 0)) {
            health = Math.floor(item.Health / 10);
        }

        return {
            percent: percent,
            name: item.NZBName.replace(/_/g, ' ')
                              .replace(/([.\/\\-])/g, '$1<wbr>'),
            status: parse.groupStatus(item),
            progressClass: kind,
            statusText: statusText,
            health: health,
            postInfo: postInfo
        };
    }


    function setupItem(obj) {
        var item = parseItem(obj._item);

        if(obj.titleElement.innerHTML !== item.name) {
            obj.titleElement.innerHTML = item.name;
        }
        obj.textElement.innerText = item.statusText;
        obj.progressBar.querySelector('.bar').style.width = item.percent + '%';
        obj.progressBar.className = 'progress_bar ' + item.progressClass;
        if(item.health < 100) {
            obj.badgeElement.innerText = 'health: ' + item.health + '%';
            obj.badgeElement.classList.add('active');
        }
        if(item.postInfo) {
            obj.postElement.innerHTML = item.postInfo;
        }
    }


    CBProto.createdCallback = function() {
        var shadowRoot = this.createShadowRoot(),
            template = owner.querySelector('template'),
            clone = document.importNode(template.content, true);

        shadowRoot.appendChild(clone);

        this.titleElement = shadowRoot.querySelector('.title');
        this.progressBar = shadowRoot.querySelector('.progress_bar');
        this.textElement = shadowRoot.querySelector('.text');
        this.badgeElement = shadowRoot.querySelector('.health-warning');
        this.postElement = shadowRoot.querySelector('.postinfo');

        var that = this;

        shadowRoot.querySelector('#btn_move_top')
        .addEventListener('mousedown', function() {
            var fileId = that._item.LastID;
            window.ngAPI.sendMessage(
                'editqueue', [
                    'GroupMoveTop',
                    0,
                    '',
                    [fileId]
                ], function() {});
        });
        shadowRoot.querySelector('#btn_move_bottom')
        .addEventListener('mousedown', function() {
            var fileId = that._item.LastID;
            window.ngAPI.sendMessage(
                'editqueue', [
                    'GroupMoveBottom',
                    0,
                    '',
                    [fileId]
                ], function() {});
        });

        shadowRoot.querySelector('#btn_pause')
        .addEventListener('mousedown', function() {
            var fileId = that._item.LastID,
                status = that._item.status,
                method = status === 'paused' ? 'GroupResume' :
                                               'GroupPause';
            window.ngAPI.sendMessage(
                'editqueue',
                [method, 0, '', [fileId]],
                function() {});
        });

        shadowRoot.querySelector('#btn_delete')
        .addEventListener('mousedown', function() {
            var fileId = that._item.LastID;
            if(confirm('Are you sure?')) {
                window.ngAPI.sendMessage(
                    'editqueue',
                    ['GroupDelete', 0, '', [fileId]],
                    function() {});
            }
        });

        shadowRoot.querySelector('.menu')
        .addEventListener('mouseup', function() {
            var ripple = this.querySelector('.ripple');
            if(ripple) {
                ripple.mousedown = false;
                if(!ripple.isAnimating) {
                    ripple.isAnimating = false;
                    ripple.classList.remove('animate');
                }
            }
        });

        shadowRoot.querySelector('.menu')
        .addEventListener('mousedown', function(e) {
            e.preventDefault();
            var ripple = this.querySelector('.ripple');
            var rect = this.getBoundingClientRect();
            if(!ripple) {
                ripple = document.createElement('div');
                ripple.className = 'ripple';
                ripple.addEventListener('animationend', function() {
                    this.isAnimating = false;
                    if(!this.mousedown) {
                        this.classList.remove('animate');
                    }
                });
                ripple.addEventListener('mouseout', function() {
                    this.mousedown = false;
                    if(!this.isAnimating) {
                        this.isAnimating = false;
                        this.classList.remove('animate');
                    }
                });
                this.appendChild(ripple);
                var d = Math.max(rect.width, rect.height);
                ripple.style.height = d + 'px';
                ripple.style.width = d + 'px';
            }
            ripple.mousedown = true;
            ripple.classList.remove('animate');

            var prect = this.getBoundingClientRect();
            var x = e.pageX - prect.left - ripple.offsetWidth / 2;
            var y = e.pageY - prect.top - ripple.offsetHeight / 2;
            ripple.style.top = y + 'px';
            ripple.style.left = x + 'px';

            ripple.isAnimating = true;
            ripple.classList.add('animate');
        });

        shadowRoot.querySelector('.menu')
        .addEventListener('click', function() {
            var ctx = this.nextElementSibling,
                label = that._item.status === 'paused' ? 'Resume' :
                                                         'Pause';
            ctx.classList.toggle('show');
            ctx.querySelector('#btn_pause span').innerText = label;
        });

        var setItemProperty = function(item) {
            that._item = item;
            setupItem(that);

            Object.defineProperty(that._item, 'FileSizeMB', {
                get: function() {
                    return that._item._FileSizeMB;
                },
                set: function(nv){
                    that._item._FileSizeMB = nv;
                    setupItem(that);
                }
            });

        };
        if(this.item) {
            setItemProperty(this.item);
        }
        Object.defineProperty(that, 'item', {
            get: function() {
                return that._item;
            },
            set: function(value) {
                setItemProperty(value);
            }
        });

        this.closeContextMenu = function() {
            this.shadowRoot.querySelector('.contextmenu')
            .classList.remove('show');
        };
    };
    document.registerElement('download-item', {prototype: CBProto});
})();
