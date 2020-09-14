/*
 * server_client_clicks.js
 * @author(arii)
 *
 * clicks on the form get distributed to all clients.
 * */

const socket = io( {
    transports:['websocket']
});


socket.on('click', function(msg){
    console.log(msg);
    handleClick(msg);
});


function handleClick(msg){
    if (msg.pause){
        handle_spotify_pause();
    }else if(msg.next){
        handle_spotify_next();
    }else{
        if(msg.workout_time==null){
            console.log("cannot format tabata timing");
            return;
        }
        // handle tabata timing
        console.log("doing tabata timing");
        handle_tabata_timing(msg);
    }
}

function emitClick(next, pause, workout_time, rest_time){
    
    var ds_next = next || false;
    var ds_pause = pause || false;
    var ds_workout_time = workout_time || null;
    var ds_rest_time = rest_time || null;

    var ds = {
        'next': ds_next,
        'pause': ds_pause,
        'workout_time': ds_workout_time,
        'rest_time': ds_rest_time
        };
    socket.emit("click_client", ds);
}


/* handle clicked events from socket emit */

function handle_spotify_pause(){
    do_spotify_pause();
}

function handle_spotify_next(){
    do_spotify_next();
}

function handle_tabata_timing(data){
    $("#workSec").val(data.workout_time);
    $("#restSec").val(data.rest_time);
    tabataFormClicked();
};


/* emit socket events */

function spotify_next(){
    //do_spotify_next();
    emitClick(true); 
}

function spotify_pause(){
    //do_spotify_pause();
    emitClick(false, true);
}

function tabata_timing(data){
    workSec = $('#workSec').val();
    restSec = $('#restSec').val();
    emitClick(false, false, workSec, restSec);
};

$("#tabataForm").submit( function(event) {
    event.preventDefault();
    tabata_timing();
});

$("#Next").click(function(){
    spotify_next()
});

$("#Pause").click(function(){
    spotify_pause()
});


/* original clicks 
$("#tabataForm").submit( function(event) {
    event.preventDefault();
    tabataFormClicked();
});

$("#Next").click(function(){
    do_spotify_next()
});

$("#Pause").click(function(){
    do_spotify_pause()
});
*/

