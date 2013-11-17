window.addEvent('domready', function(){
	api = chrome.extension.getBackgroundPage().ngAPI;
	opts = api.Options;
	var result = api.status();
	new Element('div', {text: JSON.stringify(result)}).inject(document.body);

});
