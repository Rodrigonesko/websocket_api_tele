const mongoose = require('mongoose')

const chatScheema = mongoose.Schema({
    de: String,
    para: String,
    mensagem: String,
    horario: String,
    lida: Boolean
})

module.exports = mongoose.model('Chat', chatScheema)