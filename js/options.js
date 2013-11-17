window.addEvent('domready', function(){
	api = chrome.extension.getBackgroundPage().ngAPI;
	opts = api.Options;

	Array.each($$('input[type=text],input[type=password]'), function(o){
		o.value = opts.get(o.id);
	});
	
	$('btn_save').addEvent('click', function(){
		Array.each($$('input[type=text],input[type=password]'), function(o){
			opts.set(o.id, o.value);
		});
	});

	$('btn_test').addEvent('click', function(){
		var result = api.version();
		new Element('div', {text: JSON.stringify(result)}).inject(document.body);
	});

});