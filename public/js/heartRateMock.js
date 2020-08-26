 $(function () {
const socket = io( {
    transports:['websocket']
});
var update = null;


$("#inputMockData").submit( function(event) {
    event.preventDefault();
    if (update == null){
        update = setInterval(updateHR, 500);
        $("#sendMock").text("stop sending mock data");
    }else{
        clearInterval(update);
        update = null;
        $("#sendMock").text("send mock data");

    }

    updateHR()
    });

function updateHR(){
    var name = $("#mockName").val();
    var age = $("#mockAge").val();
    var rate = $("#mockRate").val();
    var device = $("#mockID").val();
   // var status_msg = $("#mockStatus").val();
   // var status_color = $("#mockStatusColor").val();

    if($("#noise").prop("checked") == true){
       function randi(max_val){
           return Math.floor(Math.random()*(max_val +1.0));
       }
        rate =  parseInt(rate) + randi(10)- 5;
    }
    var hr = {
            'name': name, 
            'age': age,
            'rate': rate,
            'device': device,
            }
    console.log("sent", hr);
    socket.emit('hrm_client', hr);

  }

});


