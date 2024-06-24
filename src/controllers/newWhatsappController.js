const express = require('express')
const routes = express.Router()
const whatsappService = require('../services/whatsapp.service')
const auth = require('../middlewares/auth')

routes.post('/sendTemplateMessage', auth, async (req, res) => {
    const { de, para, template, variaveis } = req.body
    const usuario = req.user
    return await whatsappService.sendTemplateMessage(de, para, template, variaveis, usuario)
})

routes.post('/sendMessage', auth, async (req, res) => {
    const { de, para, mensagem } = req.body
    const usuario = req.user
    return await whatsappService.sendMessage(de, para, mensagem, usuario)
})

routes.post('/receiveMessage', async (req, res) => {
    return await whatsappService.receiveMessage(req.body)
})

routes.post('/updateStatus', async (req, res) => {
    return await whatsappService.updateStatus(req.body)
})

module.exports = routes