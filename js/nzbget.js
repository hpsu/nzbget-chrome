function main() {
	chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
		if ( message === "updateOptions" ) {
			nzbGetChrome.loadMenu();
		}
	});

    nzbGetChrome.loadMenu();
}
