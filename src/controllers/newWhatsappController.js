const express = require('express')
const routes = express.Router()
const whatsappService = require('../services/whatsapp.service')
const mandaAtendimentoAutomatizado = require('../usecases/mandaAtendimentoAutomatizado.usecase')
const auth = require('../middlewares/auth')

routes.post('/sendTemplateMessage', auth, async (req, res) => {
    const { de, para, template, variaveis } = req.body
    const usuario = req.user
    return res.json(await whatsappService.sendTemplateMessage(de, para, template, variaveis, usuario))
})

routes.post('/sendMessage', auth, async (req, res) => {
    const { de, para, mensagem } = req.body
    const usuario = req.user
    return res.json(await whatsappService.sendMessage(de, para, mensagem, usuario))
})

routes.post('/mandaAtendimentoAutomatizado', auth, async (req, res) => {
    const { id } = req.body
    return res.json(await mandaAtendimentoAutomatizado.exec(id))
})

routes.post('/receiveMessage', async (req, res) => {
    return res.json(await whatsappService.receiveMessage(req.body))
})

routes.post('/updateStatus', async (req, res) => {
    return res.json(await whatsappService.updateStatus(req.body.SmsSid, req.body.SmsStatus))
})

module.exports = routes