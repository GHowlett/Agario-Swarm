var region = 'US-Atlanta'; //server region to request
var party = process.argv[2] || '';
var target = process.argv[3] || '';
var swarmSize = process.argv[4] || 10;

var http = require('http');
var AgarioClient = require('agario-client');

var interval_id = 0; //here we will store setInterval's ID

var clients = [];
for (var i=0; i< swarmSize; i++) 
    clients.push(new AgarioClient('swarmer_' + i));

clients.forEach(function(client){
    client.debug = 1; //setting debug to 1 (avaialble 0-5)
    client.facebook_key = ''; //you can put here your facebook key. Check in README.md how to get it

    // //here adding custom properties/events example shown
    // AgarioClient.prototype.addFriend = function(ball_id) { //adding client.addFriend(ball_id) function
    //     var ball = client.balls[ball_id];
    //     ball.is_friend = true; //set ball.is_friend to true
    //     ball.on('destroy', function() { //when this friend will be destroyed
    //         client.emit('friendLost', ball); //emit friendEaten event
    //     });
    //     client.emit('friendAdded', ball_id); //emit friendAdded event
    // };

    // AgarioClient.Ball.prototype.isMyFriend = function() { //adding ball.isMyFriend() funtion
    //     return this.is_friend == true; //if ball is_friend is true, then true will be returned
    // };

    // client.on('ballAppear', function(ball_id) { //when we somebody
    //     var ball = client.balls[ball_id];
    //     if(ball.mine) return; //this is mine ball
    //     if(ball.isMyFriend()) return; //this ball is already a friend
    //     if(ball.name == 'agario-client') { //if ball have name 'agario-client'
    //         client.addFriend(ball_id); //add it to friends
    //     }
    // });

    // client.on('friendLost', function(friend) { //on friendLost event
    //     client.log('I lost my friend: ' + friend);
    // });

    // client.on('friendAdded', function(friend_id) { //on friendEaten event
    //     var friend = client.balls[friend_id];
    //     client.log('Found new friend: ' + friend + '!');
    // });
    // //end of adding custom properties/events example

    client.on('mineBallDestroy', function(ball_id, reason) { //when my ball destroyed
        if(reason.by) {
            client.log(client.balls[reason.by] + ' ate my ball');
        }
        if(reason.reason == 'merge') {
            client.log('my ball ' + ball_id + ' merged with my other ball, now i have ' + client.my_balls.length + ' balls');
        }else{
            client.log('i lost my ball ' + ball_id + ', ' + client.my_balls.length + ' balls left');
        }
    });

    client.on('myNewBall', function(ball_id) { //when i got new ball
        client.log('my new ball ' + ball_id + ', total ' + client.my_balls.length);
    });

    client.on('lostMyBalls', function() { //when i lost all my balls
        client.log('lost all my balls, respawning');
        client.spawn('agario-client'); //spawning new ball with nickname "agario-client"
    });

    client.on('experienceUpdate', function(level, current_exp, need_exp) { //if facebook key used and server sent exp info
        client.log('Experience update: Current level is ' + level + ' and experience is ' + current_exp + '/' + need_exp);
    });

    client.on('connected', function() { //when we connected to server
        client.log('spawning');
        client.spawn('agario-client'); //spawning new ball
        interval_id = setInterval(gotoTarget, 100); //we will search for target name and sacrifice ourself
    });

    client.on('connectionError', function(e) {
        client.log('Connection failed with reason: ' + e);
        client.log('Server address set to: ' + client.server + ' please check if this is correct and working address');
    });

    client.on('reset', function() { //when client clears everything (connection lost?)
        clearInterval(interval_id);
    });

    function gotoTarget() {
        if(!client.balls[ client.my_balls[0] ]) return; //if our ball not spawned yet then we abort. We will come back here in 100ms later
        
        // find target ball
        var target_ball;
        for(var ball_id in client.balls) { 
            var ball = client.balls[ball_id];
            if (ball.name == target) {
                target_ball = ball;
                break;
            }
        }

        if (target_ball) client.moveTo(target_ball.x, target_ball.y); //we send move command to move to food's coordinates
    }
});

function getDistanceBetweenBalls(ball_1, ball_2) { //this calculates distance between 2 balls
    return Math.sqrt( Math.pow( ball_1.x - ball_2.x, 2) + Math.pow( ball_2.y - ball_1.y, 2) );
}

console.log('Requesting server in region ' + region);
AgarioClient.servers.getPartyServer({region: region, party_key: party}, function(srv) { //requesting server
    if(!srv.server) return console.log('Failed to request server (error=' + srv.error + ', error_source=' + srv.error_source + ')');
    console.log('Connecting to ' + srv.server + ' with key ' + srv.key);

    clients.forEach(function(client){
        client.connect('ws://' + srv.server, srv.key);
    });
});


