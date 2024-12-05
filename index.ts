import express from 'express'
// import cors from 'cors'
import { createServer } from 'node:http';
import { Server } from 'socket.io'

const app = express()
const server = createServer(app);

type ServerToClientEvents = {
  message: (sender: string, id: number, msg: string) => void;
}

type ClientToServerEvents = {
  message: (sender: string, id: number, msg: string, callback: (response: { status: "ok" | "error" }) => void) => void
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

io.on('connection', (socket) => {
  console.log('React app has connected to the server');

  socket.on('disconnect', function () {
    console.log("A React app left :(");
  });

  socket.on('message', function (sender, id, msg, callback) {
    console.log(`sender: ${sender} id: ${id} msg: ${msg}`)
    io.emit("message", sender, id, msg)
    callback({ status: "ok" })
  });

})

server.listen(3000, () => {
  console.log("Server is live!!")
})

// console.log("Time to try with the server now!")