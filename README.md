<img src="img/icon48.png" align="absmiddle"> nzbget-chrome
=============

Google chrome extension to interact with nzbget

### Version history
#### 1.5 - (current dev)

---

#### 1.4 - 2016-01-19
* New tabbed popup appearance
* History search
* Chromium 49 compatibility fixes

---


#### 1.3 - 2015-06-05
* Make popup notifications optional and use new rich notification API.
* Try to lookup status in notified downloads
* Use category Detected from site markup when no category is present in header.
* Support one-click integration for spotweb, binsearch, nzbindex.com
* Fixes and polish

---

#### 1.2 - 2014-10-13
* Better handling of connection failures.
* support one-click integration on nzbindex.nl
* support one-click integration on fanzub.com
* support one-click integration on DOGnzb (thanks @GrimSerious)
* Minor fixes to feedly support due to layout changes
* Updated appearance
* New feature: [optional] Persistent download status on download icons.
* Progress bars now show estimated remaining download time

---

#### 1.1 - 2014-05-31
* Protocol selector (Thanks dakky)
* Less strict nzb header check (Thanks dakky)
* One-click site integration for newznab, feedly and nzbclub
* Provides category to NZBGet if available
* Show paused state on badge label color (Thanks pdf)
* Show nzb health in popup on low quality nzbs
* Use webp-icon in notifications, since rich notifications lost support for SVG
* Additional polish and bugfixes

---

#### 1.0 - 2013-12-31
* Initial release

### Current main features
* Browser action popup that displays active downloads, history and stats
* Browser action icons badge indicating number of current active downloads
* Adds a context menu item to links to download with NZBGet
* Notification when downloads complete
* Uses no toolkits or frameworks, just Javascript, CSS3 and chrome.*-apis
* Drag-n-drop sorting of download queue
* Flow control (pause, resume, delete) on individual items or whole queue.
* One click site intergarion on newznab sites and feedly.com

### Installation from chrome webstore
https://chrome.google.com/webstore/detail/nzbget-chrome/pbhceneiekgjjeblaghpkdkaomlloghm

### Installation instructions (as unpacked extension)
*Note: Newer versions of chrome for windows will show a yellow icon backgorund for unpacked extensions*

1. Download a release or checkout repo with git
2. Open chrome://extensions/ in Chrome / Chromium
3. Make sure the "Developer mode" checkbox is checked.
4. Click "Load unpacked extension..." and choose the path you used in step 1.
