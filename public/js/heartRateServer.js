 $(function () {
var clients = {"dummy":null};
var client_timers = {};
var client_last_update = {};

var stale_interval_time = 2000;
var STALE_TIMEOUT= 30000;


const socket = io( {
    transports:['websocket']
});


socket.on('hrm', function(msg){
    console.log(msg);
    handleHRM(msg);
});


function handleHRM(msg){
   if(msg.device==null){
       return;
   }
    id = msg.device;
    if (!(id in clients)){
        addNewClient(msg);
        if("dummy" in clients){
            removeClient("dummy");
        }
    }
    console.log("updating date");
    client_last_update[clients[msg.device]]= Date.now();
    updateHRM(msg);
}

function updateHRM(msg){
    id =clients[msg.device];
    $("#HRCardHeader_"+ id).text(msg.name);
    $("#HRCardHeaderAge_"+ id).text(msg.age);
    $("#HR_"+ id).text(msg.rate);
    //$("#statusBar_"+ id).text(msg.status_msg);
    //$("#statusBarDiv_"+ id).css("background-color", msg.status_color);


    zone = computeZone(msg.age, msg.rate);
    console.log(computeZone(msg.age, msg.rate));
    console.log(computeZonePercent(msg.age, msg.rate));
    console.log(computeZoneAndPercent(msg.age, msg.rate));
    background = computeZoneStyle(msg.age, msg.rate);
    console.log(background);
    $("#HR_"+id).parent().css("background-color", background);





}

function checkDataIsRecent(msg){
    id = clients[msg.device]
    offset = Date.now() - client_last_update[id]
    console.log("is id recent?", id, offset);
    if(offset > STALE_TIMEOUT){
        removeClient(msg.device);

    } else if (offset > 2*stale_interval_time){
        var hr = {
            'name': msg.name,
            'age': msg.age,
            'rate': "--",
            'device': msg.device,
            }
        updateHRM(hr);

    }
}

function removeClient(device){
    if (device == "dummy"){
        id = "dummy";
    }else{
        id = clients[device]
        clearInterval(client_timers[id]);
    }


    console.log("removing client " + id);
    $("#card_" + id).remove();
    delete clients[device];
    delete client_timers[id]
    delete client_last_update[id]
};

function addNewClient(msg){
    if ("dummy" in clients){
        id = 0;
    }else{
        id = Object.keys(clients).length + 1;
    }

    clients[msg.device] = id;
    client_timers[id] =  setInterval(function() {checkDataIsRecent(msg)}, stale_interval_time);
    client_last_update[id]= Date.now();
    //replaceAll not available 
    //new_card = empty_card.replaceAll("dummy", id);
    new_card = empty_card.split("dummy").join(id);
    console.log(new_card);
    $("#cards").append(new_card);

    // ADD HTML For new square
}
empty_card = `
<div id="card_dummy" class="card text-center" style="width: 18rem;">
  <div class="card-header">
      <h1 id="HRCardHeader_dummy" > Heart Rate </h1>
      <h5 id="HRCardHeaderAge_dummy" >  </h5>
  </div>

  <div class="card-body">
      <h4 id="statusText_dummy">
        &#x2764;
      </h4>
        <h1 id="HR_dummy" class="display-1">
        </h1>
  </div>
`;
/*  <div class="card-footer" id="statusBarDiv_dummy">
      <p id="statusBar_dummy">waiting for heart rate data</p>
  </div> */

});


