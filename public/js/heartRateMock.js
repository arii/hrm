 $(function () {
const socket = io( {
    transports:['websocket']
});

$("#inputMockData").submit( function() {
    var name = $("#mockName").val();
    var age = $("#mockAge").val();
    var rate = $("#mockRate").val();
    var device = $("#mockID").val();
    var status_msg = $("#mockStatus").val();
    var status_color = $("#mockStatusColor").val();
    var hr = {
            'name': name, 
            'age': age,
            'status_msg': status_msg,
            'status_color': status_color,
            'rate': rate,
            'device': device,
            }
    socket.emit('hrm_client', hr);


  });

});


