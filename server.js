

const net = require('net');

const Networker = require('./networker');

let clients = [];
let server = net.createServer();

server.on('connection', (socket) => {
  console.log('new client arrived');

  let networker = new Networker(socket, (data) => {
    console.log('received:', data.toString());
  });
  networker.init();
  clients.push({ socket, networker });
  networker.send('Hi,client!,this is Server0');

  socket.on('end', () => {
    console.log('socket end');
  });
  socket.on('close', () => {
    console.log('socket close');
  });
  socket.on('error', (e) => {
    console.log(e);
  });
});

server.listen(8080);