const express = require('express')
const router = express.Router()

const publicController = require('../controllers/publicController')
const userController = require('../controllers/UserController')
const propostaController = require('../controllers/propostaController')
const auth = require('../middlewares/auth')
const verifyToken = require('../middlewares/verifyToken')

router.get('/verifyToken', auth, verifyToken.verify)

router.get('/', publicController.index)
router.post('/login', publicController.login)
router.post('/logout', publicController.logout)

router.get('/user', auth, userController.index)

router.post('/upload', auth, propostaController.upload)
router.get('/show', auth, propostaController.show)
router.get('/naoRealizadas', auth, propostaController.buscarPropostasNaoRealizadas)
router.get('/proposta/:id', auth, propostaController.mostrarPropostaPorId)
router.put('/agendar', auth, propostaController.agendar)
router.put('/reagendar', auth, propostaController.reagendar)
router.put('/cancelar', auth, propostaController.cancelar)
router.delete('/delete/:id', auth, propostaController.delete)
router.put('/alterarTelefone', auth, propostaController.alterarTelefone)
router.get('/naoAgendadas', auth, propostaController.naoAgendadas)
router.get('/agendadas', auth, propostaController.agendadas)
router.put('/alterarVigencia', auth, propostaController.alterarVigencia)
router.put('/alterarFormulario', auth, propostaController.alterarFormulario)
router.put('/alterarSexo', auth, propostaController.alterarSexo)
router.put('/voltarEntrevista', auth, propostaController.voltarEntrevista)
router.put('/tentativaContato', auth, propostaController.tentativaContato)
router.put('/concluir', auth, propostaController.concluir)
router.get('/naoEnviadas', auth, propostaController.naoEnviadas)
router.get('/ajustar', auth, propostaController.propostasAAjustar)
router.put('/ajustar', auth, propostaController.ajustarCpf)
router.put('/enviarMensagem', auth, propostaController.enviarMensagem)
router.get('/situacao/:situacao', auth, propostaController.situacao)

router.post('/receiveMessage', propostaController.mensagemRecebida)

router.get('/teste', propostaController.testeMensagem)

module.exports = router