const express = require('express');
const app = express();
const cookieParser = require('cookie-parser')
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
require('dotenv').config()
const cors = require("cors");
app.use(cors({ credentials: true, origin: true }));

//Mongo 
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URL)

const routes = require('./src/config/routes')


app.use(express.json({ limit: '100mb' }))
app.use(cookieParser())
app.use(function (req, res, next) {

  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

io.on('connection', (socket) => {
  console.log('a user connected');
});

app.use('/', routes)

server.listen(3002, () => {
  console.log('listening on *:3002');
}); 