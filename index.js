var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var db = require('pg');
var config = require('./config.json');
var connectionString = "postgres://"+config.postgres.user+":"+config.postgres.password+"@"+config.postgres.host+"/"+config.postgres.db;
var clients = {};
var motorizados = {};
var pedidos_pendientes = [];

io.on('connection', function(socket) {
  socket.on('i-am', function(type) {
  	clients[socket.id] = {'type': type};
  	if (type == 'WEB'){
		  io.to(socket.id).emit('you-are', socket.id);
		  console.log("I AM WEB: " + socket.id);
  	}else
  	if (type == 'CELL'){
  		console.log("I AM CEL: " + socket.id);
  		socket.on('ionic-qr', function(msg){
  			console.log('QR:');
  			console.log(msg);
        io.to(msg.web_id).emit('ionic-qr', msg.cell_id);
		  });
      socket.on('cell-active', function(msg) {
        clients[socket.id].cell_id = msg.cell_id
        motorizados[msg.cell_id] = socket.id;
        console.log('cell-active', motorizados);
        io.to(socket.id).emit('list-pedidos', pedidos_pendientes);
      });
      socket.on('accept-pedido', function(msg) {
        var index = pedidos_pendientes.findIndex(function(pedido){
          return pedido.id == msg.pedido_id;
        });
        console.log('accept-pedido', msg, index, pedidos_pendientes[index]);
        for (var i in clients){
          if (clients[i].type == 'CELL' && socket.id != i){
           io.to(i).emit('delete-pedido', pedidos_pendientes[index]);
          }
        }
        delete pedidos_pendientes[index];
        pedidos_pendientes.splice(index, 1);
      });
		  socket.on('send-gps', function(msg){
  			console.log('GPS:');
  			console.log(msg);
  			for (var i in clients){
  				if (clients[i] == 'WEB'){
					 io.to(i).emit('send-gps', msg);
  				}
  			}
		  });
  	}
  });


  socket.on('hola',function(data){
    console.log(data);
    console.log(data.web_id+"  "+socket.id);
    io.to(socket.id).emit('respuesta', {id_gps:'7845652456'});
  });


  socket.on('add-pedido', function(data) {
    pedidos_pendientes.push(data);
    delay_pedido(data);
    for (var i in clients){
      if (clients[i].type == 'CELL'){
        io.to(i).emit('notify-pedido', data);
      }
    }
  });
});


app.get('/', function(req, res){
  res.sendFile(__dirname + '/web.html');
});

app.get('/jquery.js', function(req, res){
  res.sendFile(__dirname + '/jquery.js');
});
app.get('/jquery.qrcode.js', function(req, res){
  res.sendFile(__dirname + '/jquery.qrcode.js');
});


app.get('/cell', function(req, res){
  res.sendFile(__dirname + '/cell.html');
});


http.listen(3000, function(){
  console.log('listening on *:3000');
});


function delay_pedido(data){
  setTimeout(function(){
    var index = pedidos_pendientes.indexOf(data);
    if (index > -1) {
      delete pedidos_pendientes[index];
      pedidos_pendientes.splice(index, 1);
      console.log("pedido eliminado", data);
      for (var i in clients){
        if (clients[i].type == 'CELL'){
         io.to(i).emit('delete-pedido', data);
        }
      }
    }
  }, data.time);
}