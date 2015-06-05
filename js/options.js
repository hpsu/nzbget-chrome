(function(){
    'use strict';
    function parseComponentsFromURL(value) {
        var x = new URL(value);

        document.querySelector('#opt_protocol').value = x.protocol.replace(
            ':', '');
        document.querySelector('#opt_host').value = x.hostname;
        document.querySelector('#opt_port').value = x.port ? x.port : 80;

        var keys = ['username', 'password', 'pathname'];
        for(var i in keys) {
            var key = 'opt_' + keys[i],
                el = document.getElementById(key);
            el.value = x[keys[i]];
        }
        return x;
    }

    document.addEventListener('DOMContentLoaded', function() {
        var elConnectionTest = document.querySelector('#connection_test');
        window.ngAPI = chrome.extension.getBackgroundPage().ngAPI;
        var opts = window.ngAPI.Options;

        document.querySelector('name').innerText = window.ngAPI.appName;
        document.querySelector('version').innerText = window.ngAPI.appVersion;

        var inputs = document.querySelectorAll(
            'input[type=text],input[type=password],ng-checkbox,select'
        );

        for(var i = 0; i < inputs.length; i++) {
            inputs[i].value = opts.get(inputs[i].id);
        }

        document.querySelector('#btn_save')
        .addEventListener('click', function(){
            for(var input in inputs) {
                opts.set(inputs[input].id, inputs[input].value);
            }
            chrome.runtime.sendMessage({message: 'optionsUpdated'});

            elConnectionTest.innerText = 'Settings saved!';
            elConnectionTest.className = 'success';
        });


        document.querySelector('#btn_test')
        .addEventListener('click', function(){
            elConnectionTest.className = 'working';
            elConnectionTest.innerText = 'Trying to connect...';
            elConnectionTest.style.webkitAnimationName = 'flip';

            var opOb = {get: function(v) {return this[v]; }};
            for(var input in inputs) {
                opOb[inputs[input].id] = (inputs[input].id,
                                          inputs[input].value);
            }

            window.ngAPI.version(function(r){
                elConnectionTest.innerText = 'Successfully connected ' +
                                             'to NZBGet v' + r.result;
                elConnectionTest.style.webkitAnimationName = 'pulse';
                elConnectionTest.className = 'success';
            }, function(reason){
                elConnectionTest.className = 'error';
                elConnectionTest.style.webkitAnimationName = 'shake';
                elConnectionTest.innerHTML = '<strong>' +
                                             'Connection failed!' +
                                             '</strong> ' + reason;
            }, opOb);
        });
        elConnectionTest.addEventListener('webkitAnimationEnd', function(){
            this.style.webkitAnimationName = '';
        }, false);
        elConnectionTest.addEventListener('click', function(){
            this.innerHTML = '';
            this.className = '';
        });
        /* Parse text in host field and try to place URI-parts
           in their right form fields. */
        document.querySelector('#opt_host')
        .addEventListener('blur', function() {
            var prot = this.value.match(/^([a-z]+):\/\//);

            if(prot) {
                parseComponentsFromURL(this.value);
            }
        });
    });
})();
