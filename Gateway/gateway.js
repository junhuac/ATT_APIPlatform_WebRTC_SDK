/*
WebRTC Gateway
Author: Junhua Chang
Email: jc837a@att.com
Company: AT&T Mobility
Date: 01-17-2014

This is a WebRTC gateway which implements features listed in AT&T WebRTC NB Spec.
*/

// JavaScript source code for WebRTC NB REST services

var restify = require('restify');

function respond(req, res, next) {
    res.send('hello ' + req.params.name);
}

var server = restify.createServer();
server.get('/hello/:name', respond);
server.head('/hello/:name', respond);

var app = server.listen(1337, function () {
    console.log((new Date()) + '%s listening at %s', server.name, server.url);
});

// create the socket server on the port
var io = require('socket.io').listen(app);

// This callback function is called every time a socket
// tries to connect to the server
io.sockets.on('connection', function(socket) {

    console.log((new Date()) + ' Connection established.');

  	// When a user send a SDP message
  	// broadcast to all users in the room
  	socket.on('message', function(message) {
        console.log((new Date()) + ' Received Message, broadcasting: ' + message);
        socket.broadcast.emit('message', message);
    });

    // When the user hangs up
    // broadcast bye signal to all users in the room
    socket.on('disconnect', function() {
        // close user connection
        console.log((new Date()) + " Peer disconnected.");
        socket.broadcast.emit('user disconnected');
    });

});
