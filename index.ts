import express from 'express'
// import cors from 'cors'
import { createServer } from 'node:http';
import { Server } from 'socket.io'

const app = express()
const server = createServer(app);

type ServerToClientEvents = {
  message: (sender: string, id: number, msg: string, fromGroup: "one" | "two") => void;
}

type ClientToServerEvents = {
  message: (sender:string, id:number, msg:string, selectedGroup: "one" | "two", cryptoId: `${string}-${string}-${string}-${string}-${string}`, callback: (response: {status: "ok" | "error"}, cryptoId: `${string}-${string}-${string}-${string}-${string}`, selectedGroup: "one" | "two" ) => void) => void,
  joinRoom: (roomName: string) => void
}

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: "http://localhost:5173"
  }
})

// app.use(cors())

// app.get('/', function (req, res) {
//   // res.send({name: "aditya"})
//   res.json("aditya")
// })

let number = 12000;

async function wait(millisecond: number) {
  await new Promise( resolve => {
    setTimeout(resolve, millisecond)
  } )
}

io.on('connection', (socket) => {
  console.log('A React app has connected to the server');

  socket.on('disconnect', function () {
    console.log("A React app left :(");
  });

  socket.on('message', async function (sender, id, msg, selectedGroup, cryptoId, callback) {
    // console.log(`sender: ${sender} id: ${id} msg: ${msg}`)
    console.log(`Waiting for ${number}ms `)
    const initialWait = number
    number = number/2;
    await wait(number * 2)
    console.log(`new wait is ${number}ms`)
    io.to(selectedGroup).emit("message", sender, id, msg, selectedGroup)
    console.log(`received crypto id is ${cryptoId}, with wait = ${initialWait}`)
    callback({ status: "ok" }, cryptoId, selectedGroup )
  });

  socket.on("joinRoom", (roomName:string) => {
    // console.log(`socket attempting to join ${roomName}`)
    socket.join(roomName)
  })

})

server.listen(3000, () => {
  console.log("Server is live!!")
})

// console.log("Time to try with the server now!")