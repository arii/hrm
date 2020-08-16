var createError = require('http-errors');
var express = require('express');
var socket_io    = require( "socket.io" );
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');


var app = express();

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/chat.html');
});


// Socket.io
var io           = socket_io();
app.io           = io;

// socket.io events

io.on('connection', function(socket){
  socket.on('chat message', function(msg){
    io.emit('chat message', msg);
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
