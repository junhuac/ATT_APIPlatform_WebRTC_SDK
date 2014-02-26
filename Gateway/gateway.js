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

/**
 * User event map
 * 
 * events[user] = [ event1, event2, ... ]
 */
var events = {}

/**
 * Pending requests per user
 *
 * pending[user] : [ requestCtx1, requestCtx2, ... ]
 */
var pending = {};

/**
 * Timeout of a pending request in seconds
 */
var connectionTimeout = 60;

/**
 * Maximum age of events in seconds
 */
var maxAge = 60;

/**
 * Global counter for unique ids
 */
var lastRequestId = 0;

/**
 * Global counter for unique session ids
 */
var lastSessionId = 0;

/**
 * Helper function for compacting an array by removing
 * all null values. 
 *
 * @param Array arr - the input array
 * @return Array A new array with all the non-null values from 'arr'
 */
function compact(arr) {
    if (!arr) return null;
    var i, data = [];
    for (i = 0; i < arr.length; i++) {
        if (arr[i]) data.push(arr[i]);
    }
    return data;
}

/**
 * Returns the current time in milliseconds from 1 Jan 1970, 00:00
 */
function currentTimestamp() {
    return new Date().getTime();
}

/**
 * Helper function for logging a debug message
 *
 * @param String user    - the username
 * @param int requestId  - the request id (optional)
 * @param String message - the message
 */
function debug(user, requestId, message) {
    if (message) {
        console.log("[" + user + "/" + requestId + "] " + message);
    } else {
        console.log("[" + user + "] " + requestId);
    }
}

/**
 * Adds a new event 'type' and optional 'data' for 
 * the user. 
 *
 * @param String user - the username
 * @param String type - the event type
 * @param Object data - an optional data object
 */
function addEvent(user, data) {
    if (!events[user]) {
        events[user] = {};
        events[user].events = {};
        events[user].events.eventList = [];
    }

    var event = {
        eventObject: {}
    }

    if (data)
        event.eventObject = data;

    events[user].events.eventList.push(event);
    debug(user, "P", "added " + JSON.stringify(event));
}

/**
 * Returns the next event for the user.
 *
 * The next event is the first (oldest) event after the 
 * the 'timestamp'. If 'timestamp' is omitted the oldest 
 * event which has not expired is returned.
 *
 * The 'timestamp' parameter represents the last event
 * the caller has seen and the function returns the 
 * next event. 
 *
 * While iterating over the events the function also
 * expires events which are older than maxAge seconds.
 *
 * @param String user   - the username
 * @param int timestamp - the timestamp of the last event
 * @returns Object      - an event or null
 */
function nextEvent(user) {
    var event = events[user];
    
    if (event == null) {
        return null;
    } else {
        events[user] = null;

        // return the event
        return event;
    }
}

/**
 * Checks for all pending requests for the user
 * if an event is available. If an event is 
 * available it is sent to the client and the 
 * connection is closed.
 *
 * @param String user - the username
 */
function notify(user) {
    if (!pending[user]) return;

    // loop over pending requests for the user
    // and respond if an event is available    
    var i, ctx, event;
    for (i = 0; i < pending[user].length; i++) {
        ctx = pending[user][i];

        // ctx.req == null -> timeout, cleanup
        if (!ctx.req) {
            pending[user][i] = null;
            continue;
        }

        // get next event
        event = nextEvent(user);

        // user has event? -> respond, close and cleanup
        if (event) {
            ctx.req.resume();
            ctx.res.send(event);
            ctx.res.end();
            pending[user][i] = null;
            debug(user, ctx.id, "sent " + JSON.stringify(event));
        }
    }

    // compact the list of pending requests
    pending[user] = compact(pending[user]);
}

/**
 * Pauses the current request for the user and
 * stores the request and response object in 
 * the list of pending requests for the user
 *
 * @param String user      - the username
 * @param String timestamp - the timestamp filter of the request
 * @param Object req       - the request
 * @param Object res       - the response
 * @param int requestId    - the unique request id
 */
function pause(user, req, res, requestId) {
    if (!pending[user])
        pending[user] = [];

    // save the request context
    var ctx = {
        id: requestId,
        req: req,
        res: res
    };
    pending[user].push(ctx);

    // configure a timeout on the request
    req.connection.setTimeout(connectionTimeout * 1000);
    req.connection.on('timeout', function () {
        ctx.req = null;
        ctx.res = null;
        debug(user, requestId, "timeout");
    });

    // pause the request
    req.pause();
    debug(user, requestId, "paused");
}

// Create REST API server
var server = restify.createServer();

server.use(restify.acceptParser(server.acceptable));
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.bodyParser({ mapParams: false }));
server.use(restify.CORS());
server.use(restify.throttle({
    burst: 100,
    rate: 50,
    ip: true
}));

// Connect to Mongodb
var connection_string = '127.0.0.1:27017/rtc';
var db = mongojs(connection_string, ['rtc']);
var users = db.collection("users");
var sessions = db.collection("sessions");

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

// ICMN OAuth Redirect
function oauth(req, res, next) {
    res.send(302, 'https://api.att.com/oauth/authorize?client_id=' + req.query.client_id + '&scope=RTC&redirect_uri=' + req.query.redirect_uri);
}

// Associate Access Token with user id
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

// Deassociate Access Token with user id
function deleteuserid(req, res, next) {
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

// Retrieve all user ids
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

function getevents(req, res, next) {
    var user = {};
    user.sessionid = req.params.sessionid;
    user.authorization = req.headers.authorization;

    res.setHeader('Access-Control-Allow-Origin', '*');

    // add a close handler for the connection
    req.connection.on('close', function () {
        debug(user.sessionid, requestId, "close");
    });

    // extract the parameters
    var requestId = lastRequestId++;

    // get the next event
    var event = nextEvent(user.sessionid);

    // pause the request if there is no pending event
    // or send the event
    if (!event) {
        pause(user.sessionid, req, res, requestId);
    } else {
        debug(user.sessionid, requestId, "Event: " + JSON.stringify(event));
        res.send(200, event);
        return next();
    }
}

function postevents(req, res, next) {
    var user = {};
    user.sessionid = req.params.sessionid;
    user.authorization = req.headers.authorization;

    res.setHeader('Access-Control-Allow-Origin', '*');

    // extract the parameters
    var data = req.body;

    debug(user, "P", "New Event: " + JSON.stringify(data));

    // add the event 
    addEvent(user.sessionid, data);

    // notify pending requests
    notify(user.sessionid);

    // send 200 OK
    res.send(200, '');
    return next();
}

function createsession(req, res, next) {
    var session = {};
    session.sessionid = lastSessionId++;
    session.authorization = req.headers.authorization;

    res.setHeader('Access-Control-Allow-Origin', '*');

    sessions.save(session, function (err, success) {
        console.log('Response success ' + success);
        console.log('Response error ' + err);
        if (success) {
            console.log((new Date()) + ' User session: ' + JSON.stringify(session));
            res.header("location", "RTC/v1/sessions/" + session.sessionid);
            res.header("x-expires", 3600);
            res.send(201, "");
            return next();
        } else {
            return next(err);
        }
    });
}

function refreshsession(req, res, next) {
    var session = {};
    session.sessionid = req.params.sessionid;
    session.authorization = req.headers.authorization;

    res.setHeader('Access-Control-Allow-Origin', '*');

    sessions.find({ sessionid: session.sessionid, authorization: session.authorization }, function (err, success) {
        console.log('Response success ' + success);
        console.log('Response error ' + err);
        if (success) {
            res.header("x-expires", 3600);
            res.send(204, "");
            return next();
        } else {
            return next(err);
        }
    })
}

function endsession(req, res, next) {
    var session = {};
    session.sessionid = req.params.sessionid;
    session.authorization = req.headers.authorization;

    res.setHeader('Access-Control-Allow-Origin', '*');

    sessions.remove({ sessionid: session.sessionid, authorization: session.authorization }, function (err, success) {
        if (success != null) {
            console.log('Session ended: ' + session.sessionid);
        } else {
            console.log('Response error ' + err);
        }
        if (success) {
            res.send(200, "");
            return next();
        } else {
            return next(err);
        }
    })
}
// Associate Access Token with User Id
server.post('RTC/v1/oauth/token', oauth);
server.put('RTC/v1/userids/:userid', userid);
server.del('RTC/v1/userids/:userid', deleteuserid);
server.get('RTC/v1/userids/', getuserids);

// Session Management
server.post('RTC/v1/sessions', createsession);
server.put('RTC/v1/sessions/:sessionid', refreshsession);
server.del('RTC/v1/sessions/:sessionid', endsession);

/** 
 * GET handler for retrieving events for the user.
 * The username is required and the timestamp parameter
 * is optional.
 *
 * Example: GET /?user=joe&timestamp=1296564580384
 */
server.get('RTC/v1/sessions/:sessionid/events', getevents);

/** 
 * POST handler for adding a new event for the user.
 * The user and the type parameters are required. 
 * The data object is in the body.
 */
server.post('RTC/v1/sessions/:sessionid/events', postevents);

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
