const express = require('express')
const routes = express.Router()
const auth = require('../middlewares/auth')
const propostaService = require('../services/proposta.service')

routes.get('/whatsapp/:whatsapp', auth, async (req, res) => {
    const { whatsapp } = req.params
    return res.json(await propostaService.getPropostaByWhastapp(whatsapp))
})

module.exports = routes