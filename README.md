ATT APIPlatform WebRTC SDK
==========================

This is AT&T WebRTC SDK, which enables Audio/Video call to any devices in WebRTC enabled browsers.

Prerequisite
------------

* Install node.js:
	Please go to [nodejs.org](http://nodejs.org/) and click install

* Install socket.io:
	npm install socket.io

How to Start Gateway
--------------------

	cd Gateway
	node gateway.js

How to Enable WebRTC Flags
--------------------------

* In the Chrome browser you need to make sure 2 flags are correctly set.
* Enter chrome://flags/ and set the following flags:
 
	Disable Media Source API on video elements (Set this flag to disabled)

	Enable Encrypted Media Extensions on video elements (Set this flag to enabled)

How to start WebRTC App
-----------------------

* Copy Server folder to www root of a web server
* Edit Server/index.htm and replace the ip address with the gateway ip
	<script src="http://<gateway ip>:1337/socket.io/socket.io.js"></script>
	<script>
		// create socket
		var socket = io.connect('http://<gateway ip>:1337/');
		...
	</script>

How to Start Audio/Video Call
-----------------------------

* Start Chrome, and go to http://<webserver ip>/Server/index.htm
* Click "Start video", and allow browser to use your camera and microphone
* Do the same on another machine, and click "Connect"
* Your audio-video call starts