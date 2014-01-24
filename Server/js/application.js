$(document).ready(function() {

    function getOAuthUrl() {
        var oauth_server = "https://auth.tfoundry.com";
        var authorize_path = "/oauth/authorize";

        var clientID = "c3gardsxw5nmq6p9cjwlzkwmidgapg10";
        var scope = 'profile,webrtc';
        var redirectURI = "http://localhost/webrtc/aluphone.html";

        return oauth_server + authorize_path + "?response_type=token&client_id=" +
                clientID + "&scope=" + scope + "&redirect_uri=" + redirectURI;
    }

    $(".call0 .call").hide();
    $('.call0 .hangup').hide();
    $('.call0 .answer').hide();

    var oauthParams = {},
            queryString = window.parent.location.hash.substring(1),
            regex = /([^&=]+)=([^&]*)/g,
            m,
            html = '';

    while (m = regex.exec(queryString)) {
        oauthParams[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }

    var access_token = oauthParams['access_token'];

    var thecall, att;

    if (access_token) {
        $('.call0 .login').hide();
        att = new ATT({'accessToken': access_token});

        att.on('user', function() {
            $(".call0 .login").hide();
            $(".call0 .call").show();
        });

        att.on('phoneReady', function() {
            console.log('phoneReady event');
        });

        att.on('calling', function(call) {
            $('.call0 .call').hide();
            $('.call0 .hangup').show();
            $('.call0 .answer').hide();
        });

        att.on('ring', function() {
            console.log('ring event');
        });

        att.on('callBegin', function(call) {
            if (call.remoteMediaStream) {
                var url = webkitURL.createObjectURL(call.remoteMediaStream);
                $('.call0 .remoteVideo').attr('src', url);
            }

            $('.call0 .answer').hide();
        });

        att.on('callEnd', function(call) {
            console.log("callEnd event");

            $('.call0 .call').show();
            $('.call0 .hangup').hide();
            $('.call0 .answer').hide();
            $('.call0 .remoteVideo').attr('src', '');
        });

        att.on('incomingCall', function(call, phonenumber) {
            console.log("incomingCall event");
            thecall = call;

            if (call.localMediaStream) {
                var url = webkitURL.createObjectURL(call.localMediaStream);
                $('.call0 .localVideo').attr('src', url);
            }

            $('.call0 .call').hide();
            $('.call0 .hangup').show();
            $('.call0 .answer').show();
            $('.call0 .call_to').hide();
        });

        att.on('outgoingCall', function(call) {
            console.log("outgoingCall event");
            thecall = call;

            if (call.localMediaStream) {
                var url = webkitURL.createObjectURL(call.localMediaStream);
                $('.call0 .localVideo').attr('src', url);
            }
        });

        att.on('phoneError', function(payload) {
            console.log("phoneError event");

            $('.call0 .call').show();
            $('.call0 .hangup').hide();
            $('.call0 .answer').hide();
            $(".call0 .localVideo").attr('src', '');

        });

    } else {
        $('.call0 .login').show();
        $('.call0 .call').hide();
    }

    $('.call0 .call').click(function() {
        var callee = $('.call0 .call_to').val();
        //var pub_id = "sip:+1" + callee + "@foundry.att.com";
        att.dial(callee);
    });

    $('.call0 .hangup').click(function() {
        if (thecall) {
            thecall.hangup();

            if (thecall.localMediaStream) {
                $('.call0 .localVideo').attr('src', '');
            }
        }

        $('.call0 .call').show();
        $('.call0 .hangup').hide();
    });

    $('.call0 .answer').click(function() {
        if (thecall) {
            thecall.answer();
        }
    });

    $('.call0 .login').click(function() {
        window.location.href = getOAuthUrl();
    });
});