const mongoose = require('mongoose')

const chatScheema = new mongoose.Schema({
    de: String,
    para: String,
    mensagem: String,
    horario: String,
    lida: Boolean,
    status: String,
    sid: String,
    errorCode: String,
    quemEnviou: String,
    arquivo: String
}, {
    timestamps: true
})

module.exports = mongoose.model('Chat', chatScheema)