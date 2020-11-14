'use strict'

// Create http listener
const Express = require('express')
const Http = require('http');
const WebSocket = require('ws');
const {createUUID64} = require('./uuid64')
const path = require('path')

// Create websocket listener
const app = Express()
app.use(Express.static(path.join(__dirname, '../react-game/build')));
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '../react-game/', 'index.html'));
})

const server = Http.createServer(app);
const wss = new WebSocket.Server({noServer: true})
wss.on('error', (err) => {
  console.log('Failed to create websocket listener, ' + err)
})

server.on('upgrade', function(request, socket, head) {
  console.log('Parsing session from request...');
  wss.handleUpgrade(request, socket, head, function(ws) {
    wss.emit('connection', ws, request);
  });
});

server.listen(80)
console.log('Listening to players!')

const playerMap = new Map()
function broadcast(msg){
  for (const player of playerMap.values()) {
    player.send(msg)
  }
}

// ====== Process players messages ======
wss.on('connection', (client, request) => {
  console.log('Player connected')
  console.log(request.connection.remoteAddress)

  client.clientid = createUUID64()
  playerMap.set(client.clientid, client)

  // ====== Receiving message ======
  client.on('message', (msg, flags) => {
    // Client exited
    if(null == client){
      return
    }

    const semicolonIndex = msg.indexOf(';')
    if (semicolonIndex === -1){
      console.log('client.on：semicolonIndex was not found')
      return
    }

    const msgid = msg.substring(0, semicolonIndex)
    const content = msg.substring(semicolonIndex)
    switch(msgid){
      case 'C2S_SendMessage': {
        broadcast("S2C_SendMessage;" + content)
        break
      }
      default:{
        break
      }
    }
  })

  // ====== Someone exit or refresh ======
  client.on('close', function (close) {
    console.log('Player exit or refresh')
    playerMap.delete(client.clientid)
    client = null
  })
})
