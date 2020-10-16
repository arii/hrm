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
    }else if(msg.volume_percent!=null){
        handle_volume_percent(msg);
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

function emitClick(next, pause, volume_percent, workout_time, rest_time){
    
    var ds_next = next || false;
    var ds_pause = pause || false;
    var ds_volume_percent = volume_percent ||null;
    var ds_workout_time = workout_time || null;
    var ds_rest_time = rest_time || null;

    var ds = {
        'next': ds_next,
        'pause': ds_pause,
        'volume_percent': ds_volume_percent,
        'workout_time': ds_workout_time,
        'rest_time': ds_rest_time
        };
    socket.emit("click_client", ds);
}


function spotifyOK(){
    ok = (typeof(access_token) !== "undefined")  && (typeof do_spotify_pause === "function");
    if (ok){
      setTimeout( function(){
          do_spotify_current();
      }, 1500);
    }
    return ok;
}
/* handle clicked events from socket emit */

function handle_spotify_pause(){
    if (spotifyOK()){
        do_spotify_pause();
    }
}

function handle_spotify_next(){
    if (spotifyOK()){
        do_spotify_next();
    }
}

function handle_volume_percent(msg){
    if(spotifyOK()){
        do_spotify_volume(msg.volume_percent);
    }
    if(typeof setTimerVolume == "function"){
        setTimerVolume(0.5*msg.volume_percent);
    }
}
function handle_tabata_timing(data){
    $("#workSec").text(data.workout_time);
    $("#restSec").text(data.rest_time);
    
    if(typeof tabataFormClicked === "function"){

        tabataFormClicked();
    }
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

function spotify_volume(percent){
    emitClick(false, false, percent); 
}

function tabata_timing(data){
    workSec = $('#workSec').val();
    restSec = $('#restSec').val();
    emitClick(false, false, null, workSec, restSec);
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


const $spotifySpan = $('#spotifyValSpan');
const $spotifyvalue = $('#spotifyVolume');
  $spotifySpan.html($spotifyvalue.val());
  $spotifyvalue.on('input change', () => {

    $spotifySpan.html($spotifyvalue.val());
      spotify_volume(0.8*$spotifyvalue.val());
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

