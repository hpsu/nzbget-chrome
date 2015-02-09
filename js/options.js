function parseComponentsFromURL(value) {
	var x = new URL(value);

	$('opt_protocol').value = x.protocol.replace(':','');
	$('opt_host').value = x.hostname;
	$('opt_port').value = x.port ? x.port : 80;

	var keys = ['username', 'password', 'pathname'];
	for(var i in keys) {
		var key = 'opt_' + keys[i]
			,el = $(key);
			el.value = x[keys[i]];
	}
	return x;
}

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
			parseComponentsFromURL(this.value);
		}
	});
});
