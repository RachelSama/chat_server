import express from "express"
import cors from "cors"
import http from "http"
import { Server } from "socket.io";
import Data from "./Data.js";
import { v4 as uuidv4 } from 'uuid';

const app = express()
const server = http.createServer(app);
const PORT = 4000
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3001", "http://localhost:3002", "http://localhost:4000"]
  }
});

app.use(cors())

const dataMysql = new Data();

const generateUniqueUuid = () => {
  const uniqueUuid = uuidv4();
  return uniqueUuid; 
};

io.on('connection', (socket) => {
  let uuid = socket.handshake.auth.uuid
  let userId = socket.id;

  console.log(`⚡: ${userId} user just connected!`)
  console.log((uuid) ? "Con uuid: " + uuid : "Sin uuid");

  socket.on('login', (data) => {
    console.log(data)
    const { username, password } = data;

    dataMysql.getUuidIfUserExist(username, password, (uuidUser) => {
      if (uuidUser) {
        console.log("existe el usuario")
        uuid = uuidUser;
      } else {
        console.log("no existe el usuario")
        const uniqueUuid = generateUniqueUuid();
        uuid = uniqueUuid;
        dataMysql.saveUserToDatabase(username, password, uniqueUuid);
      }
      console.log("uuid guardado: " + uuid)
      socket.emit("localStorageUuid", uuid)

      dataMysql.getRoomNameByUuid(uuid, (roomName) => {
        if (roomName !== "") {
          console.log("existe la room")
          socket.join(roomName);
          io.to(roomName).emit("roomToGetMessages", roomName)

        } else {
          console.log("se crea la room")
          const nameRoom = `room-${userId}`
          socket.join(nameRoom)
          io.to(nameRoom).emit("roomToGetMessages", nameRoom)

          io.emit('newRoom', nameRoom)

          dataMysql.insertRoom(nameRoom, uuid, [username])
        }
      });
    });
  });

  socket.on('getUserData', (storedUuid, callback) => {
    dataMysql.getUserDataByUuid(storedUuid, (userData) => {
      if (userData) {
        const { username, password } = userData;
        callback({ username, password });
      } else {
        callback(null);
      }
    });
  });

  socket.on('broadcastMessage', (data) => {

    if (data.uuid === "1234") {

      dataMysql.getAllRoomNames((roomNames) => {
        roomNames.forEach((room) => {

          io.to(room).emit("messageResponse", data)

          const user = data.name;
          const text = data.text;

          dataMysql.insertMessage(user, text, room)
        });
      })
    }
  });

  if (uuid !== "1234") {

    socket.on("message", data => {
      console.log(data)
      io.to(data.room).emit("messageResponse", data)

      const user = data.name;
      const text = data.text;
      const room = data.room
      if(room) {
        dataMysql.insertMessage(user, text, room)
      }
    })

  } else {
    dataMysql.getAllRoomNames((roomNames) => {
      io.to(userId).emit("roomListResponse", roomNames)
    })

    socket.on("message", (data) => {
      console.log(data)
      io.to(data.room).emit("messageResponse", data)

      const user = data.name;
      const text = data.text;
      const room = data.room

      if(room) {
        dataMysql.insertMessage(user, text, room)
      }
    })
  }

  socket.on("joinRoom", nameRoom => {
    dataMysql.getRoomUsers(nameRoom, (users) => {
      if (users.length > 0) {
        const userToJoin = users[0]
        socket.join(nameRoom)
        io.to(userToJoin).emit("userJoined", userId)
        io.to(userId).emit("joinedRoom", nameRoom)
      }
    })
  })

  socket.on('disconnect', () => {
    console.log('🔥: A user disconnected');
  });

  socket.on('getRoomData', async (nameRoom) => {
    dataMysql.getRoomMessages(nameRoom, (messages) => {
      socket.emit('roomData', messages);
    })
  });

});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

// app.get("/api/rooms", (req, res) => {
//   res.json(roomData);
// });