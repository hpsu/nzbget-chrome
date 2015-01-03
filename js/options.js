document.addEventListener('DOMContentLoaded', function() {
	ngAPI = chrome.extension.getBackgroundPage().ngAPI;
	opts = ngAPI.Options;

	document.querySelector('name').innerText = ngAPI.appName;
	document.querySelector('version').innerText = ngAPI.appVersion;

	var inputs = document.querySelectorAll(
		'input[type=text],input[type=password],ng-checkbox,select'
	);

	for(var i=0; i < inputs.length; i++) {
		inputs[i].value = opts.get(inputs[i].id);
	}

	$('btn_save').addEventListener('click', function(){
		for(var i in inputs) {
			opts.set(inputs[i].id, inputs[i].value);
		}
		chrome.runtime.sendMessage({message: 'optionsUpdated'});

		$('connection_test').innerText = 'Settings saved!';
		$('connection_test').className = 'success';
	});


	$('btn_test').addEventListener('click', function(){
		$('connection_test').className = 'working';
		$('connection_test').innerText = 'Trying to connect...';
		$('connection_test').style.webkitAnimationName = 'flip';

		var opOb = {get: function(v) {return this[v]}};
		for(var i in inputs) {
			opOb[inputs[i].id] =(inputs[i].id, inputs[i].value);
		}

		ngAPI.version(function(r){
			$('connection_test').innerText = 'Successfully connected to NZBGet v'+r.result;
			$('connection_test').style.webkitAnimationName = 'pulse';
			$('connection_test').className = 'success';
		}, function(reason){
			$('connection_test').className = 'error';
			$('connection_test').style.webkitAnimationName = 'shake';
			$('connection_test').innerHTML = '<strong>Connection failed!</strong> '+reason;
		}, opOb);
	});
	$('connection_test').addEventListener('webkitAnimationEnd', function(){
		this.style.webkitAnimationName = '';
	}, false);
	$('connection_test').addEventListener('click', function(){
		this.innerHTML = '';
		this.className = '';
	});
	// Parse text in host field and try to place URI-parts in their right form fields.
	$('opt_host').addEventListener('blur', function() {
		var prot = this.value.match(/^([a-z]+):\/\//);

		if(prot) {
			var a = document.createElement('a');
			a.href = this.value;
			this.value = this.value.replace(/^[a-z]+:\/\//,'');
			if(prot[1] == 'http' || prot[1] == 'https') {
				$('opt_protocol').value = prot[1];
			}
			if(a.hostname) $('opt_host').value = a.hostname;
			if(a.port) $('opt_port').value = a.port;
			if(a.username) $('opt_username').value = a.username;
			if(a.password) $('opt_password').value = a.password;
		}
	});
});
