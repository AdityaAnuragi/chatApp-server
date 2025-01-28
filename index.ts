import express from 'express'
// import cors from 'cors'

import 'dotenv/config'

import pg from "pg"

import { createServer } from 'node:http';
import { Server } from 'socket.io'

const app = express()
const server = createServer(app);

type ServerToClientEvents = {
  message: (sender: string, id: number, msg: string, fromGroup: "one" | "two") => void;
}

type ClientToServerEvents = {
  message: (sender: string, id: number, msg: string, selectedGroup: "one" | "two", cryptoId: `${string}-${string}-${string}-${string}-${string}`, callback: (response: { status: "ok" | "error" }, cryptoId: `${string}-${string}-${string}-${string}-${string}`, selectedGroup: "one" | "two") => void) => void,
  joinRoom: (roomName: string) => void
}

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: "http://localhost:5173"
  }
})

const { Client } = pg

const client = new Client({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
})

// app.use(cors())

// app.get('/', function (req, res) {
//   // res.send({name: "aditya"})
//   res.json("aditya")
// })

await client.connect()

let number = 12000;

async function wait(millisecond: number) {
  await new Promise(resolve => {
    setTimeout(resolve, millisecond)
  })
}

io.on('connection', (socket) => {
  console.log('A React app has connected to the server');

  socket.on('disconnect', function () {
    console.log("A React app left :(");
  });

  socket.on('message', async function (sender, id, msg, selectedGroup, cryptoId, callback) {
    // console.log(`sender: ${sender} id: ${id} msg: ${msg}`)
    console.log(`Waiting for ${number}ms`)
    const initialWait = number
    number = number / 2;
    await wait(number * 2)
    console.log(`new wait is ${number}ms`)

    try {
      // database sequence:
      // cryptoId, msg, id, selectedGroup (kinda), sent_at_utc

      if(initialWait <= 4000) {
        await client.query('INSERT INTO "messages" VALUES ($1, $2, $3, $4, $5)', [cryptoId, msg, 1, 1, '2025-01-01 10:35:00'])
        console.log("inserted successfully!")
        io.to(selectedGroup).emit("message", sender, id, msg, selectedGroup)
      }
    }
    catch (error) {
      console.log(error)
      console.log("there was an error")
    }

    console.log(`received crypto id is ${cryptoId}, with wait = ${initialWait}`)
    callback({ status: "ok" }, cryptoId, selectedGroup)
  });

  socket.on("joinRoom", (roomName) => {
    // console.log(`socket attempting to join ${roomName}`)
    socket.join(roomName)
  })

})

server.listen(3000, () => {
  console.log("Server is live!!")
})

// console.log("Time to try with the server now!")

// await client.end()
