import express from 'express'
// import cors from 'cors'
import { createServer } from 'node:http';
import { Server } from 'socket.io'

const app = express()
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173"
  }
})

// app.use(cors())

app.get('/', function (req, res) {
  // res.send({name: "aditya"})
  res.json("aditya")
})

io.on('connection', (socket) => {
  console.log('A React app has connected to the server');

  socket.on('disconnect', function () {
    console.log("React app left :(");
  });

  socket.on('message', function (sender:string, id:number, msg:string) {
    io.emit("message", sender, id, msg)
  });

})

server.listen(3000, () => {
  console.log("Server is live!!")
})

// console.log("Time to try with the server now!")