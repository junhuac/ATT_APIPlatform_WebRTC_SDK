ATT APIPlatform WebRTC SDK
==========================

How to Start Gateway:
cd Gateway
npm install socket.io
node gateway.js

How to Enable WebRTC flags
In the Chrome browser you need to make sure 2 flags are correctly set.
Enter chrome://flags/ and set the following flags: 
Disable Media Source API on video elements (Set this flag to disabled)
Enable Encrypted Media Extensions on video elements (Set this flag to enabled)

How to start WebRTC app:
Copy Server folder to www root of a web server
Edit Server/index.htm and replace the ip address with the gateway ip

  <script src="http://<gateway ip>:1337/socket.io/socket.io.js"></script>
  <script>
  // create socket
      var socket = io.connect('http://<gateway ip>:1337/');
  ...
  </script>

How to use WebRTC app:
Start Chrome, and go to http://<webserver ip>/Server/index.htm
Click "Start video", and allow browser to use your camera and microphone
Do the same on another machine, and click "Connect"
Your audio-video call starts