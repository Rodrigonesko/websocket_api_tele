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
router.get('/show', propostaController.show)
router.get('/naoRealizadas', auth, propostaController.buscarPropostasNaoRealizadas)
router.get('/proposta/:id', auth, propostaController.mostrarPropostaPorId)
router.put('/agendar', auth, propostaController.agendar)
router.put('/reagendar', auth, propostaController.reagendar)
router.put('/cancelar', auth, propostaController.cancelar)
router.delete('/delete/:id', auth, propostaController.delete)
router.put('/alterarTelefone', auth, propostaController.alterarTelefone)
router.put('/alterarWhatsapp', auth, propostaController.alterarWhatsapp)
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
router.get('/janelasEscolhidas', auth, propostaController.janelasEscolhidas)
router.get('/erroMensagem', auth, propostaController.problemaEnviar)
router.get('/atendimentoHumanizado', auth, propostaController.atendimentoHumanizado)
router.get('/chat/:whatsapp', auth, propostaController.chat)
router.get('/conversas/:pesquisa', auth, propostaController.conversas)
router.get('/gerarMensagens', auth, propostaController.gerarMensagens)
router.get('/naoRealizadas', auth, propostaController.naoRealizadas)
router.put('/voltarAjuste', auth, propostaController.voltarAjuste)
router.put('/mandarAtendimentoHumanizado', auth, propostaController.mandarAtendimentoHumanizado)
router.post('/sendMessage', auth, propostaController.mandarMensagem)
router.post('/sendMessageTwilio', auth, propostaController.mandarMensagemTwilio)
router.put('/encerrarAtendimento', auth, propostaController.encerrarAtendimentoJanela)
router.put('/encerrarHumanizado', auth, propostaController.encerrarHumanizado)
router.put('/assumirConversa', auth, propostaController.assumirAtendimento)
router.put('/visualizarMensagem', auth, propostaController.visualizarMensagem)
router.put('/reenviarMensagens', propostaController.reenviarMensagens)
router.put('/reenviarHorariosDisponiveis', propostaController.reenviarHorariosDisponiveis)
router.put('/alterarDadosProposta', propostaController.alterarDadosProposta)
router.get('/devolverPropostas', auth, propostaController.propostasParaDevolver)

router.put('/migrarRet', propostaController.migrarRet)
router.post('/receiveMessage', propostaController.mensagemRecebida)

router.get('/teste', propostaController.testeMensagem)

router.post('/webHookMessage', propostaController.webHookMessage)
router.post('/webHookCall', propostaController.webHookCall)
router.get('/colocandoWppSender', propostaController.colocandoWppSender)
router.get('/nomeOperadora', propostaController.migrarNomeOperadora)

module.exports = router