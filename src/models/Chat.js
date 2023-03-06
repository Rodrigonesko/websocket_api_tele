const mongoose = require('mongoose')

const horariosSCheema = mongoose.Schema({
    de: String,
    para: String,
    mensagem: String,
    horario: String,
    lida: Boolean
})

module.exports = mongoose.model('Horario', horariosSCheema)