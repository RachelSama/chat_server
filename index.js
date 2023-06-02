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

const generateUniqueToken = () => {
  const uniqueToken = uuidv4();
  return uniqueToken;
};

io.on('connection', (socket) => {
  let token = socket.handshake.auth.token
  let userId = socket.id;

  console.log(`⚡: ${userId} user just connected!`)
  console.log((token) ? "Con token: " + token : "Sin token");

  socket.on('login', (data) => {
    console.log(data)
    const { username, password } = data;

    dataMysql.getTokenIfUserExist(username, password, (tokenUser) => {
      if (tokenUser) {
        console.log("existe el usuario")
        token = tokenUser;
      } else {
        console.log("no existe el usuario")
        const uniqueToken = generateUniqueToken();
        token = uniqueToken;
        dataMysql.saveUserToDatabase(username, password, uniqueToken);
      }
      console.log("token guardado: " + token)
      socket.emit("localStorageToken", token)

      dataMysql.getRoomNameByToken(token, (roomName) => {
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

          dataMysql.insertRoom(nameRoom, token, [username], [])
        }
      });
    });
  });

  socket.on('getUserData', (storedToken, callback) => {
    dataMysql.getUserDataByToken(storedToken, (userData) => {
      if (userData) {
        const { username, password } = userData;
        callback({ username, password });
      } else {
        callback(null);
      }
    });
  });

  socket.on('broadcastMessage', (data) => {

    if (data.token === "1234") {

      dataMysql.getAllRoomNames((roomNames) => {
        roomNames.forEach((room) => {

          io.to(room).emit("messageResponse", data)

          const user = data.name
          const now = new Date();
          const message = { user: user, text: data.text, timestamp: now };

          dataMysql.insertMessage(room, message)
        });
      })
    }
  });

  if (token !== "1234") {

    socket.on("message", data => {
      console.log(data)
      io.to(data.room).emit("messageResponse", data)

      const user = data.name
      const now = new Date();
      const message = { user: user, text: data.text, timestamp: now };

      dataMysql.insertMessage(data.room, message)
    })

  } else {
    dataMysql.getAllRoomNames((roomNames) => {
      io.to(userId).emit("roomListResponse", roomNames)
    })

    socket.on("message", (data) => {
      console.log(data)
      io.to(data.room).emit("messageResponse", data)

      const user = "Unobike"
      const now = new Date();
      const message = { user: user, text: data.text, timestamp: now };

      dataMysql.insertMessage(data.room, message)
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
    dataMysql.getAllRoomNames((roomNames) => {
      io.to(userId).emit("roomListResponse", roomNames)
    })
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