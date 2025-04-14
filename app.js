var express = require('express');
var socket_io    = require("socket.io" );
var app = express();
app.use('/static', express.static('public'))
//surely there is a better way to do this???
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
app.use('/js', express.static(__dirname + '/node_modules/jaaulde-cookies/lib')); // redirect JS jQuery
app.use('/js', express.static(__dirname + '/node_modules/jaaulde-jquery-cookies/lib')); // redirect JS jQuery
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css')); // redirect CSS bootstrap
app.use('/favicon.ico', express.static(__dirname + '/favicon.ico')); // redirect CSS bootstrap

app.get('/chat', function(req, res){
  res.sendFile(__dirname + '/public/chat.html');
});

app.get('/hrm', function(req, res){
  res.sendFile(__dirname + '/public/hrm_client.html');
});

app.get('/hrm_mock', function(req, res){
  res.sendFile(__dirname + '/public/hrm_mock.html');
});

app.get('/server_only', function(req, res){
  
  res.sendFile(__dirname + '/public/hrm_server.html');
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/tabata.html');
});

app.get('/spotify', function(req, res){
  res.sendFile(__dirname + '/public/spotify.html');
});

app.get('/privacy', function(req, res){
  res.sendFile(__dirname + '/public/privacy.html');
});

app.get('/phone', function(req, res){
  res.sendFile(__dirname + '/public/phone.html');
});

app.get('/test', function(req, res){
  res.sendFile(__dirname + '/public/test.html');
});




// Socket.io
var io           = socket_io();
app.io           = io;

// socket.io events

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
  });
  
  socket.on('hrm_client', function(msg){
      io.emit('hrm', msg);
  });

  
 socket.on('click_client', function(msg){
      io.emit('click', msg);
  });


});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});


module.exports = app;