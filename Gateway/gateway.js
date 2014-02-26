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
var mongojs = require("mongojs");

var server = restify.createServer();

server.use(restify.acceptParser(server.acceptable));
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.CORS());
server.use(restify.throttle({
    burst: 100,
    rate: 50,
    ip: true
}));

var connection_string = '127.0.0.1:27017/rtc';
var db = mongojs(connection_string, ['rtc']);
var users = db.collection("users");

server.pre(function (req, res, next) {
    if (req.headers.authorization == null) {
        res.send(204, '');
        return;
    }

    if (req.headers.accept != 'application/json' && req.headers.accept != 'application/xml')
    {
        res.send(204, '');
        return;
    }

    return next();
});

function oauth(req, res, next) {
    res.send(302, 'https://api.att.com/oauth/authorize?client_id=' + req.query.client_id + '&scope=RTC&redirect_uri=' + req.query.redirect_uri);
}

function userid(req, res, next) {
    var user = {};
    user.userid = req.params.userid;
    user.authorization = req.headers.authorization;

    res.setHeader('Access-Control-Allow-Origin', '*');

    users.save(user, function (err, success) {
        console.log('Response success ' + success);
        console.log('Response error ' + err);
        if (success) {
            console.log((new Date()) + ' User login: ' + JSON.stringify(user));
            res.send(200, "");
            return next();
        } else {
            return next(err);
        }
    });
}

function deluserid(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    users.remove({ userid: req.params.userid }, function (err, success) {
        console.log('Response success ' + success);
        console.log('Response error ' + err);
        if (success) {
            res.send(204, "");
            return next();
        } else {
            return next(err);
        }
    })
}

function getuserids(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    users.find().limit(200).sort({ postedOn: -1 }, function (err, success) {
        console.log('Response success ' + success);
        console.log('Response error ' + err);
        if (success) {
            console.log((new Date()) + ' Users: ' + JSON.stringify(success));
            res.send(200, success);
            return next();
        } else {
            return next(err);
        }

    });
}

server.post('RTC/v1/oauth/token', oauth);
server.put('RTC/v1/userids/:userid', userid);
server.del('RTC/v1/userids/:userid', deluserid);
server.get('RTC/v1/userids/', getuserids);

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
