const mongoose = require('mongoose')

const chatScheema = new mongoose.Schema({
    de: String,
    para: String,
    mensagem: String,
    horario: String,
    lida: Boolean,
    status: String,
    sid: String,
})

module.exports = mongoose.model('Chat', chatScheema)