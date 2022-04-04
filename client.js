
const net = require('net');
const Networker = require('./networker');
for (let i=0;i<3;i++){
let socket = net.createConnection({ port: 8080, host: 'localhost' });
socket.on('connect', () => {
  let networker = new Networker(socket, (data) => {
    console.log('received:', data.toString());
  });
  networker.init();
  networker.send('Hi Server!,this is client'+String(i));
});
}

