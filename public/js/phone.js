/*  phone.js
 *  @author(arii)
 *
 *  phone controls for the hrm server
*/

// todo get state from server
var timer_on=false;

function updateHotkeys(work, rest){
/* update default timing settings */
    $('#workSec').val(work);
    $('#restSec').val(rest);
}

$("#tabataFormPhone").submit( function(event) {
    event.preventDefault();
    if (timer_on){
        // set timer off
        timer_on = false;
        $("#startStop").text("Start Timer");
    }else{
        timer_on = true;
        $("#startStop").text("Start Timer");
    }
    tabata_timing();
});


$("#twentyten").click(function(){
    updateHotkeys("20","10");
});

$("#thirtyfifteen").click(function(){
    updateHotkeys("30","15");
});
$("#emom").click(function(){
    updateHotkeys("60","60");
});

