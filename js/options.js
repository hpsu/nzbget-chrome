function $(o) {
	return document.getElementById(o);
}

document.addEventListener('DOMContentLoaded', function() {
	api = chrome.extension.getBackgroundPage().ngAPI;
	opts = api.Options;

	var inputs = document.body.querySelectorAll('input[type=text],input[type=password],select')

	for(var i in inputs) {
		inputs[i].value = opts.get(inputs[i].id);
	}
		
	$('btn_save').addEventListener('click', function(){
		for(var i in inputs) {
			opts.set(inputs[i].id, inputs[i].value);
		}
		chrome.runtime.sendMessage({message: 'optionsUpdated'});
	});

	$('btn_test').addEventListener('click', function(){
		$('connection_test').innerText = 'Trying to connect...';
		$('connection_test').className = 'working';
		api.sendMessage('version', {}, function(r){
			$('connection_test').innerText = 'Successfully connected to NZBGet v'+r.result;
			$('connection_test').className = 'success';
		}, function(reason){
			$('connection_test').className = 'error';
			$('connection_test').innerText = 'Connection failed! '+reason;
		});
	});
});
