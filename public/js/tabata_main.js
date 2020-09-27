    function byId(id) {
        return document.getElementById(id);
    }

    function minSecToMS(min, sec) {
        return min * 60 * 1000 + sec * 1000;
    }

    function pad(num, size) {
        var s = num + '';
        while (s.length < size) s = '0' + s;
        return s;
    }

    var lapElByIndex = function(index) {
        return document.getElementsByClassName('lap' + index)[0];
    };

    var renderTime = function(elapsed, format) {
        var min = pad(parseInt((elapsed / 1000) / 60, 10), 2);
        var sec = pad(parseInt(elapsed / 1000 % 60, 10), 2);
        var el = document.getElementsByClassName('time')[0];

        if (!format) {
            format = 'MM:SS';
        }

        switch (format) {
        case 'MM:SS':
            el.innerText = min + ':' + sec;
            break;

        case 'SS':
            el.innerText = sec;
            break;
        }
    };

    var renderIntervals = function(timer) {
        return
        document.getElementById('intervalCount').childNodes[0].nodeValue = timer.currentSet() + '/' + timer.sets.length;
    };
    
    var renderStatus = function(text) {
        $("#status_text").text(text);

    };


    var renderControls = function(timer) {
        if (!timer.isRunning()) {
            $("#startStop").css("background-color", "#00ff00");
            
            if($("#auto_spotify").prop("checked") == true){
                spotify_pause();
                console.log("pause");
            }

        }else{
            $("#startStop").css("background-color", "#ff0000");
            
            if($("#auto_spotify").prop("checked") == true){
                spotify_next();
                console.log("next");
            }

        }
    };

    var selectedLap = null;
    var lastTickTime = null;
    var isMuted = false;
    var loadedAudio = false;
    var shortBeep = document.getElementById('shortBeep');
    var longBeep = document.getElementById('longBeep');
    function loadAudio() {
        if (!loadedAudio) {
            // On iOS you can't play back sounds unless it comes from a user
            // action first, so pretend to play the sound in this callback so
            // that it actually plays in the timer countdown later on
            shortBeep.play();
            shortBeep.pause();
            shortBeep.currentTime = 0;
            longBeep.play();
            longBeep.pause();
            longBeep.currentTime = 0;
            loadedAudio = true;
        }
    }

    function setTimerVolume(volume_percent){
        longBeep.volume = volume_percent/100.0;
        shortBeep.volume = volume_percent/100.0;
    }



    function playShort() {
        if (isMuted) {
            return;
        }
        shortBeep.play();
    }

    function playLong() {
        if (isMuted) {
            return;
        }
        longBeep.play();
    }

    var tickCb = function(timer, elapsed, isStartCountdown, starting, setWorking, finished) {
        lastTickTime = elapsed;

        if (!selectedLap) {
            var format = 'MM:SS';
            if (isStartCountdown) {
                format = 'SS';
            }

            // Starting countdown or countdown timer and reached the end of the timer
            // then beep
            if(isStartCountdown){
                renderStatus("starting");
            }else if (timer.isCountdownTimer()){
                if(finished){
                    renderStatus("done");
                }else if (setWorking){
                    renderStatus("work");
                }else{
                    renderStatus("rest");
                }

            }
        
            if (isStartCountdown || timer.isCountdownTimer()) {
                if (elapsed > 0 && elapsed <= 3000) {
                    playShort();
                }
            }

            if (starting || (timer.isCountdownTimer() && elapsed <= 0)) {
                playLong();
                //renderStatus("Workout time elapsed");

            }
            renderTime(elapsed, format);
        }
    };

    var newLapCb = function(timer) {
        // pass
        return; 
    };

    
    var clearCb = function(timer) {
        selectedLap = null;
        renderTime(0);
        renderControls(timer);
        renderIntervals(timer);
        renderStatus("Finished session");
    };

    var newSetCb = function(timer) {
        renderIntervals(timer);
        renderStatus("rest");
    };

    var timer = new Timer(tickCb, newLapCb, clearCb, newSetCb);
    /*
    byId('lapReset').addEventListener('click', function() {
        timer.lapResetTimer();
    });
    */
    
   /* $("#tabataForm").submit( function(event) {
    // moved to server_client_clicks.js
        event.preventDefault();
        tabataFormClicked();
    });*/

    function tabataFormClicked(){
        updateValuesFromInputs();
        timer.toggleTimer();
        renderControls(timer);

        $("#status_text").text("");
    };



   /* 
    byId('emom').addEventListener('click', function() {
        updateHotkeys("60", "60");
    });

    byId('twentyten').addEventListener('click', function() {
        updateHotkeys("20", "10");
    });

    byId('thirtyfifteen').addEventListener('click', function() {
        updateHotkeys("30", "15");
    });
*/

    var updateHotkeys= function(work, rest){

        byId('workSec').value = work
        byId('restSec').value = rest

    }
    /* removing laps
    byId('laps').addEventListener('click', function(evt) {
        for (var i=0; i<10; ++i) {
            lapElByIndex(i).classList.remove('lapSelected');
        }

        var lapEl = evt.target;
        lapEl.classList.add('lapSelected');
        if (selectedLap == evt.target) {
            lapEl.classList.remove('lapSelected');
            selectedLap = null;
            renderTime(lastTickTime);
        }
        else {
            selectedLap = lapEl;
            var lap = timer.laps()[parseInt(lapEl.getAttribute('data-lap'), 10)];
            renderTime(lap.time);
        }
    });
    */

    byId('muteToggleButton').addEventListener('click', function(evt) {
        isMuted = !isMuted;

        var src = '';
        if (isMuted) {
            src = '/static/assets/speaker-muted.png';
        } else {
            src = '/static/assets/speaker.png';
            loadAudio();
        }
        document.querySelector('#muteToggleButton img').src = src;
    });

   /* byId('settingsButton').addEventListener('click', function(evt) {
        byId('timerUI').classList.add('hidden');
        byId('settingsUI').classList.remove('hidden');
    });


    byId('done').addEventListener('click', function(evt) {
        updateValuesFromInputs();
    });*/


    function updateValuesFromInputs(){
        function getVal(value) {
            console.log(value);
            var val = parseInt(value, 10);
            if (isNaN(val)) {
                val = 0;
            }
            return val;
        }

        var countdownMin, countdownSec;
        countdownMin = 0;
        countdownSec = 0; 

        var workMin, workSec, numSets, restMin, restSec;
        workMin = 0;
        workSec = getVal(byId('workSec').innerText);
        restMin = 0;
        restSec = getVal(byId('restSec').innerText);
        numSets = 1000; // basically infinity 

        if (countdownMin > 0 || countdownSec > 0) {
            //This is a countdown timer
            timer.setCountdown(countdownMin, countdownSec);
            //byId('intervalUI').classList.add('hidden');
        } else if (numSets > 0 &&
            (workMin > 0 || workSec > 0)) {

            var sets = [];
            for (var i=0; i<numSets; ++i) {
                sets.push({
                    work: minSecToMS(workMin, workSec),
                    rest: minSecToMS(restMin, restSec)
                });
            }
            timer.setSets(sets);
          //  byId('intervalUI').classList.remove('hidden');
        }
        else {
            timer.setSets([]);
            timer.setCountdown(0, 0);
         //   byId('intervalUI').classList.add('hidden');
        }

        //renderControls(timer);
        renderIntervals(timer);
        renderTime(minSecToMS(countdownMin, countdownSec));

       // byId('settingsUI').classList.add('hidden');
       // byId('timerUI').classList.remove('hidden');
    }
