import mysql from "mysql2";

class Data {
  constructor() {
    this.connection = mysql.createConnection({
      host: "localhost",
      user: "rachel",
      password: "12345678",
      database: "chat",
    });
    this.connect();
    this.createTables();
  }

  connect() {
    this.connection.connect((err) => {
      if (err) {
        console.error("Error al conectar a la base de datos:", err);
      } else {
        console.log("Conexión exitosa a la base de datos");
      }
    });
  }

  createTables() {
    const roomsTableQuery = `CREATE TABLE IF NOT EXISTS room (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(250) NOT NULL,
      uuid VARCHAR(250),
      users TEXT,
      messages TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    const usersTableQuery = `CREATE TABLE IF NOT EXISTS user (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(250) NOT NULL,
      password VARCHAR(250) NOT NULL,
      uuid VARCHAR(250),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;

    this.connection.query(roomsTableQuery, (err) => {
      if (err) {
        console.error("Error al crear la tabla 'rooms':", err);
      } else {
        console.log("Tabla 'rooms' creada exitosamente");
      }
    });

    this.connection.query(usersTableQuery, (err) => {
      if (err) {
        console.error("Error al crear la tabla 'user':", err);
      } else {
        console.log("Tabla 'user' creada exitosamente");
      }
    });
  }

  insertRoom(name, token, users, messages) {
    const insertQuery = `INSERT INTO room (name, uuid, users, messages) VALUES (?, ?, ?, ?)`;
    const values = [name, token, JSON.stringify(users), JSON.stringify(messages)];

    this.connection.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error("Error al insertar una nueva sala:", err);
      } else {
        console.log("Nueva sala insertada exitosamente");
        console.log("ID de la sala:", result.insertId);
      }
    });
  }

  insertMessage(roomName, message) {
    const insertQuery = `UPDATE room SET messages = JSON_ARRAY_APPEND(messages, '$', ?) WHERE name = ?`;
    const value = JSON.stringify(message);

    this.connection.query(insertQuery, [value, roomName], (err, result) => {
      if (err) {
        console.error("Error al insertar un nuevo mensaje:", err);
      } else {
        console.log("Nuevo mensaje insertado exitosamente en la sala:", roomName);
        console.log("Número de filas afectadas:", result.affectedRows);
      }
    });
  }

  getAllRoomNames(callback) {
    const selectQuery = "SELECT name FROM room";

    this.connection.query(selectQuery, (err, results) => {
      if (err) {
        console.error("Error al obtener los nombres de las salas:", err);
        callback([]);
      } else {
        const roomNames = results.map((row) => row.name);
        callback(roomNames);
      }
    });
  }

  getRoomMessages(roomName, callback) {
    const selectQuery = "SELECT messages FROM room WHERE name = ?";

    this.connection.query(selectQuery, [roomName], (err, results) => {
      if (err) {
        console.error("Error al obtener los mensajes de la sala:", err);
        callback([]);
      } else {
        const messages = results[0] ? JSON.parse(results[0].messages) : [];
        callback(messages);
      }
    });
  }

  getTokenIfUserExist(username, password, callback) {
    const selectQuery = "SELECT uuid FROM user WHERE username = ? AND password = ?";

    this.connection.query(selectQuery, [username, password], (err, results) => {
      if (err) {
        console.error("Error al obtener el token del usuario:", err);
        callback();
      } else {
        if (results.length > 0 && results[0].uuid) {
          callback(results[0].uuid);
        } else {
          callback();
        }
      }
    });
  }

  saveUserToDatabase(username, password, token) {
    const insertQuery = `INSERT INTO user (username, password, uuid) VALUES (?, ?, ?)`;
    const values = [username, password, token];

    this.connection.query(insertQuery, values, (err, result) => {
      if (err) {
        console.error("Error al guardar el usuario en la base de datos:", err);
      } else {
        console.log("Usuario guardado exitosamente en la base de datos");
        console.log("ID del usuario:", result.insertId);
      }
    });
  }

  getRoomUsers(roomName, callback) {
    const selectQuery = "SELECT users FROM room WHERE name = ?";

    this.connection.query(selectQuery, [roomName], (err, results) => {
      if (err) {
        console.error("Error al obtener los usuarios de la sala:", err);
        callback([]);
      } else {
        const users = results[0] ? JSON.parse(results[0].users) : [];
        callback(users);
      }
    });
  }

  getRoomNameByToken(token, callback) {
    const selectQuery = "SELECT name FROM room WHERE uuid = ?";
  
    this.connection.query(selectQuery, [token], (err, results) => {
      if (err) {
        console.error("Error al obtener el nombre de la sala:", err);
        callback();
      } else {
        const roomName = results[0] ? results[0].name : "";
        callback(roomName);
      }
    });
  }

  getUserDataByToken(token, callback) {
    const selectQuery = "SELECT username, password FROM user WHERE uuid = ?";

    this.connection.query(selectQuery, [token], (err, results) => {
      if (err) {
        console.error("Error al obtener los datos del usuario por token:", err);
        callback(null);
      } else {
        if (results.length > 0) {
          const { username, password } = results[0];
          callback({ username, password });
        } else {
          callback(null);
        }
      }
    });
  }

}

export default Data;
