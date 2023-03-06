const mongoose = require('mongoose')

const userScheema = mongoose.Schema({
    email: String,
    name: String,
    password: String,
    accessLevel: Boolean,
    firstAccess: Boolean
})

module.exports = mongoose.model('User', userScheema)