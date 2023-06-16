const express = require('express');
const app = express();
const cookieParser = require('cookie-parser')
const http = require('http');
const server = http.createServer(app);
// const { Server } = require("socket.io");
// const io = new Server(server, {
//   cors: {
//     origin: true
//   }
// });

const io = require('socket.io')(server, {
  cors: {
    origin: true
  }
})

require('dotenv').config()
const cors = require("cors");
app.use(cors({ credentials: true, origin: true }));

//Mongo 
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URL)

module.exports = {
  io
}

//Tasks

const lembreteMensagem = require('./src/tasks/lembreteMensagem')
const reenviarMensagens = require('./src/tasks/reenvioMensagem')

reenviarMensagens()

setInterval(reenviarMensagens, 4000000)

setInterval(lembreteMensagem, 300000)

// lembreteMensagem()


const routes = require('./src/config/routes')

app.use(express.json({ limit: '100mb' }))
app.use(cookieParser())
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.use('/', routes)

const port = process.env.PORT || 3000

server.listen(port, () => {
  console.log(`server rodando na porta ${port}`);
}); 