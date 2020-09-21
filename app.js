var createError = require('http-errors');
var express = require('express');
var socket_io    = require( "socket.io" );
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


var app = express();
app.use('/static', express.static('public'))
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js')); // redirect bootstrap JS
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist')); // redirect JS jQuery
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



/*

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

*/
module.exports = app;
