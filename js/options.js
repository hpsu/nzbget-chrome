function $(o) {
	return document.getElementById(o);
}

document.addEventListener('DOMContentLoaded', function() {
	api = chrome.extension.getBackgroundPage().ngAPI;
	opts = api.Options;

	var inputs = document.body.querySelectorAll('input[type=text],input[type=password]')

	for(var i in inputs) {
		inputs[i].value = opts.get(inputs[i].id);
	}
		
	$('btn_save').addEventListener('click', function(){
		for(var i in inputs) {
			opts.set(inputs[i].id, inputs[i].value);
		}
		chrome.runtime.sendMessage('optionsUpdated');
	});

	$('btn_test').addEventListener('click', function(){
		var result = api.version();
		console.log(JSON.stringify(result));
	});
});