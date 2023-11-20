const mongoose = require('mongoose')

const Scheema = new mongoose.Schema({
    text: String,
    user: String,
    data: String,
    cpfTitular: String
})

module.exports = mongoose.model('Comentario', Scheema)