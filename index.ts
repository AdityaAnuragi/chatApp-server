import express from 'express'
// import cors from 'cors'

import 'dotenv/config'

import pg from "pg"

import { createServer } from 'node:http';
import { Server } from 'socket.io'

const app = express()
const server = createServer(app);

type ServerToClientEvents = {
  message: (sender: string, id: number, msg: string, fromGroup: string) => void,
  getMissedMessages: (message: {[groupId: string]: Omit<Message, "fromusername" | "togroupid">[]}) => void,
  getGroupIdsAndNames: (groupIdsAndName: {[id: string]: {name: string, chatType: "group" | "private"} }) => void
}

type ClientToServerEvents = {
  message: (sender: string, id: number, msg: string, selectedGroup: string, cryptoId: `${string}-${string}-${string}-${string}-${string}`, callback: (response: { status: "ok" | "error" }, cryptoId: `${string}-${string}-${string}-${string}-${string}`, selectedGroup: string) => void) => void,
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

// TODO - 
// 1) change the types, server just sends an  any[]

// 2) properly send the data and also use it properly on the frontend

await client.connect()

let number = 12000;

async function wait(millisecond: number) {
  await new Promise(resolve => {
    setTimeout(resolve, millisecond)
  })
}

// the query  to fetch all the messages that were missed by a user who was offline when the message was sent
// SELECT * FROM messages m JOIN groupmembers gm ON gm.groupid = m.togroupid WHERE ( (gm.userid = 1) AND (m.sent_at_utc > gm.last_opened_utc));
// WHERE gm.userid = 1 is just the unique id of the user;

type Message = {
  id: `${string}-${string}-${string}-${string}-${string}`,
  msg: string,
  senderID: number,
  togroupid: number,
  fromusername: string
}

function getDoubleDigitFormat(value: string) {
  if(value.length === 1) {
    return `0${value}`
  }
  return value
}

function getTimeStamp() {
  const date = new Date()

  const theActualMonth = getDoubleDigitFormat(`${Number(date.getUTCMonth()) + 1}`)

  const theActualDate = getDoubleDigitFormat(`${date.getUTCDate()}`)

  const theActualHour = getDoubleDigitFormat(`${date.getUTCHours()}`)

  const theAcutalMinutes = getDoubleDigitFormat(`${date.getUTCMinutes()}`)

  const theActualSeconds = getDoubleDigitFormat(`${date.getUTCSeconds()}`)

  // '2025-01-30 11:26:00 '
  const timeStamp = `${date.getFullYear()}-${theActualMonth}-${theActualDate} ${theActualHour}:${theAcutalMinutes}:${theActualSeconds}`
  console.log(timeStamp)
  return timeStamp
}

io.on('connection', async (socket) => {
  getTimeStamp()
  console.log('A React app has connected to the server ');
  const userId = socket.handshake.query.userId
  // console.log(userId)
  // const result = await client.query("SELECT  * FROM messages m JOIN groupmembers gm ON gm.groupid = m.togroupid JOIN users u ON m.fromuserid = u.id  WHERE ( (gm.userid = $1) AND (m.sent_at_utc > gm.last_opened_utc))", [1])
  // const result = await client.query("SELECT TRIM(m.id) AS messageId, TRIM(m.message) AS message, m.fromuserid, m.togroupid, m.sent_at_utc, TRIM(u.name) AS username FROM messages m JOIN groupmembers gm ON gm.groupid = m.togroupid JOIN users u ON m.fromuserid = u.id  WHERE ( (gm.userid = $1) AND (m.sent_at_utc > gm.last_opened_utc));", [userId])
  const result = await client.query<Message>('SELECT TRIM(m.id) as "id", TRIM(m.message) AS "msg", m.fromuserid AS "senderID", m.togroupid, TRIM(u.name) AS "fromusername" FROM messages m JOIN users u ON m.fromuserid = u.id WHERE m.togroupid IN ( SELECT groupid FROM groupmembers WHERE userid = $1)', [userId])

  // {
  //   id: 'd0a755d6-0744-4525-949d-f312d4839e53',
  //   msg: 'another query that user 1 hasnt seen',
  //   senderid: '2', 
  //   togroupid: '2', 
  //   fromusername: 'Ben'
  // }

  const groupByArr: {[groupId: string]: Omit<Message, "fromusername" | "togroupid">[]} = {}

  result.rows.forEach((value) => {
    const newVal: Omit<Message, "fromusername" | "togroupid"> = {id: value.id, msg: value.msg, senderID: Number(value.senderID) }
    newVal.msg = `${value.fromusername}: ${value.msg}`
    if(groupByArr[value.togroupid]) {
      groupByArr[value.togroupid].push(newVal)
    }
    else {
      groupByArr[value.togroupid] = [newVal]
    }
  })

  // console.log(groupByArr)

  // result.rows.reduce()

  // const foo = Object.groupBy(result.rows, ({ togroupid }) => togroupid)
  // console.log(foo)

  io.to(socket.id).emit("getMissedMessages", groupByArr)

  const queryGroupIdsAndNamesAsArr = await client.query<{id: string, name: string, chatType: "group" | "private"}>('Select id, TRIM(name) AS name, chat_type AS "chatType" from groups');

  console.log(queryGroupIdsAndNamesAsArr.rows)

  const groupIdsAndNamesAsObj: Parameters<ServerToClientEvents["getGroupIdsAndNames"]>[0] = {}

  queryGroupIdsAndNamesAsArr.rows.forEach(group => {
    groupIdsAndNamesAsObj[group.id] = {name: group.name, chatType: group.chatType}
  })

  console.log(groupIdsAndNamesAsObj)

  io.to(socket.id).emit("getGroupIdsAndNames", groupIdsAndNamesAsObj)

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
      // cryptoId, msg, id (user id), selectedGroup (group id) (kinda), sent_at_utc

      if (initialWait <= 4000) {
        await client.query('INSERT INTO "messages" VALUES ($1, $2, $3, $4, $5)', [cryptoId, msg, id, selectedGroup, getTimeStamp()])
        console.log("inserted successfully! ")
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
