const mongoose = require('mongoose');

const Scheema = new mongoose.Schema({
    name: String,
    contentSid: String,
    message: String,
}, {
    timestamps: true
});

const TemplateMessage = mongoose.model('TemplateMessage', Scheema);

module.exports = TemplateMessage;