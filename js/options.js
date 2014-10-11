function $(o) {
	return document.getElementById(o);
}

document.addEventListener('DOMContentLoaded', function() {
	api = chrome.extension.getBackgroundPage().ngAPI;
	opts = api.Options;

	var inputs = document.body.querySelectorAll(
		'input[type=text],input[type=password],input[type=checkbox],select'
	);

	for(var i in inputs) {
		if(inputs[i].type == 'checkbox') {
			inputs[i].checked = opts.get(inputs[i].id);
			console.log('set %o to %s',inputs[i],inputs[i].checked);
		}
		else {
			inputs[i].value = opts.get(inputs[i].id);
		}
	}

	$('btn_save').addEventListener('click', function(){
		for(var i in inputs) {
			opts.set(inputs[i].id, inputs[i].type == 'checkbox' ? inputs[i].checked : inputs[i].value);
		}
		chrome.runtime.sendMessage({message: 'optionsUpdated'});

		$('connection_test').innerText = 'Settings saved!';
		$('connection_test').className = 'success';
	});

	$('btn_test').addEventListener('click', function(){
		$('connection_test').innerText = 'Trying to connect...';
		$('connection_test').className = 'working';
		api.sendMessage('version', {}, function(r){
			$('connection_test').innerText = 'Successfully connected to NZBGet v'+r.result;
			$('connection_test').className = 'success';
		}, function(reason){
			$('connection_test').className = 'error';
			$('connection_test').innerHTML = '<strong>Connection failed!</strong> '+reason;
		});
	});
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
