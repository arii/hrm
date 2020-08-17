 $(function () {
var clients = {"dummy":null};
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
    updateHRM(msg);
}

function updateHRM(msg){
    id =clients[msg.device];

    $("#HRCardHeader_"+ id).text(msg.name);
    $("#HRCardHeaderAge_"+ id).text(msg.age);
    $("#HR_"+ id).text(msg.rate);
    $("#statusBar_"+ id).text(msg.status_msg);
    $("#statusBarDiv_"+ id).css("background-color", msg.status_color);



}

function removeClient(id){
    if (id == "dummy"){
        id = "dummy";
    }else{
        id=clients[id];
    }
    console.log("removing client " + id);
    $("#" + id + "_card").remove();
    delete clients[id];
};

function addNewClient(msg){
    if ("dummy" in clients){
        id = 0;
    }else{
        id = clients.keys(dictionary).length + 1;
    }
    clients[msg.device] = id;
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

  <div class="card-footer" id="statusBarDiv_dummy">
      <h5 id="statusBar_dummy">waiting for heart rate data</h5>
  </div>
`;

});


