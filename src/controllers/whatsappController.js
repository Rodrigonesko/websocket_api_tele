const PropostaEntrevista = require('../models/PropostaEntrevista');
const Chat = require('../models/Chat');
const moment = require('moment');
require('moment-business-days')
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const TwilioNumber = process.env.TWILIO_NUMBER
const TwilioNumberPme = process.env.TWILIO_NUMBER_PME
const TwilioNumberSP = process.env.TWILIO_NUMBER_SP
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const VoiceResponse = require('twilio').twiml.VoiceResponse;
const { modeloMensagem1, modeloMensagem2 } = require('../utils/functions')
const { calcularIdade } = require('../utils/functions')
const { ExcelDateToJSDate } = require('../utils/functions')
const { calcularDiasUteis } = require('../utils/functions')

const { io } = require('../../index')

module.exports = {

    enviarMensagem: async (req, res) => {
        try {

            const { proposta, modeloEscolhido, data1, data2 } = req.body

            let mensagem
            let opcaoDia1 = data1
            let opcaoDia2 = data2
            let modelo

            const wppSender = proposta.wppSender

            if (modeloEscolhido === 'Modelo 1') {
                mensagem = modeloMensagem1(proposta.nome, data1, data2).mensagem
                modelo = '1'
            }

            if (modeloEscolhido === 'Modelo 2') {
                mensagem = modeloMensagem2(proposta.nome, data1, data2).mensagem
                modelo = '2'
            }

            if (proposta.tipoAssociado === 'Dependente') {
                return res.json({ msg: 'Dependente' })
            }

            if (!proposta.cpfTitular) {
                return res.json({ msg: 'sem cpfTitular' })
            }

            if (proposta.situacao !== 'A enviar') {
                return res.json({ msg: 'Não ajustado' })
            }

            let whatsapp = proposta.whatsapp


            const verificar = await PropostaEntrevista.findOne({
                _id: proposta._id,
                situacao: 'Enviado',
                naoEnviar: true
            })

            if (verificar) {
                console.log('ja foi enviado');
                return res.json({ msg: 'Ja foi enviado' })
            }

            const result = await client.messages.create({
                from: wppSender,
                body: mensagem,
                to: whatsapp
            })

            //Preciso chamar essa funcao após 2 segundos para que o Twilio consiga verificar o status da mensagem

            let verificarStatusMensagem

            verificarStatusMensagem = await client.messages(result.sid).fetch()

            verificarStatusMensagem = await client.messages(result.sid).fetch()

            verificarStatusMensagem = await client.messages(result.sid).fetch()

            verificarStatusMensagem = await client.messages(result.sid).fetch()

            verificarStatusMensagem = await client.messages(result.sid).fetch()

            if (verificarStatusMensagem.status === 'undelivered') {
                console.log('Problema ao enviar');
                const update = await PropostaEntrevista.updateMany({
                    cpfTitular: proposta.cpfTitular
                }, {
                    situacao: 'Problemas ao Enviar',
                    newStatus: 'Problemas ao Enviar'
                })

                return res.json({ msg: 'Problemas ao Enviar' })
            }

            if (verificarStatusMensagem.status === 'failed') {
                console.log('Sem whatsapp');
                const update = await PropostaEntrevista.updateMany({
                    cpfTitular: proposta.cpfTitular
                }, {
                    situacao: 'Sem whatsapp',
                    newStatus: 'Sem whatsapp'
                })
                return res.json({ msg: 'Sem whats' })
            }

            const update = await PropostaEntrevista.updateMany({
                cpfTitular: proposta.cpfTitular
            }, {
                situacao: 'Enviada',
                horarioEnviado: moment().format('YYYY-MM-DD HH:mm'),
                opcaoDia1,
                opcaoDia2,
                modelo,
                contato1: moment().format('YYYY-MM-DD HH:mm'),
                responsavelContato1: 'Bot Whatsapp',
            })

            const mensagemBanco = await Chat.create({
                de: wppSender,
                para: whatsapp,
                mensagem,
                horario: moment().format('YYYY-MM-DD HH:mm'),
                status: verificarStatusMensagem.status,
                sid: verificarStatusMensagem.sid
            })

            return res.json({ msg: 'Enviada' })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    mensagemRecebida: async (req, res) => {
        try {
            const { from, mensagem, fixed } = req.body
            await Chat.create({
                de: fixed,
                para: TwilioNumber,
                mensagem,
                horario: moment().format('YYYY-MM-DD HH:mm')
            })
            //Caso seja sabado, domingo, se passou das 17:30 ou é antes das 08:30 da manha retorna mensagem de fora do horario de atendimento
            const diaDaSemana = moment().format('dddd')
            const hora = moment().format('HH:mm')
            if (diaDaSemana === 'Saturday' || diaDaSemana === 'Sunday' || hora > '17:30' || hora < '08:30') {
                const msg = "Olá, nosso horário de atendimento é de segunda a sexta das 08:30 às 17:30, responderemos sua mensagem assim que possível. A amil agradece seu contato."
                const messageTwilio = await client.messages.create({
                    from: TwilioNumber,
                    body: msg,
                    to: from
                })
                await Chat.create({
                    de: TwilioNumber,
                    para: fixed,
                    mensagem: msg,
                    horario: moment().format('YYYY-MM-DD HH:mm'),
                    status: messageTwilio.status,
                    sid: messageTwilio.sid
                })

                return res.json(msg)
            }
            const find = await PropostaEntrevista.findOne({
                whatsapp: fixed,
                status: { $ne: 'Cancelado', $ne: 'Concluído' }
            });
            if (!find) {
                //mandar mensagem para atendimento humanizado
                const msg = "Seu número não consta em nossa base de contatos"
                const messageTwilio = await client.messages.create({
                    from: TwilioNumber,
                    body: msg,
                    to: from
                })
                await Chat.create({
                    de: TwilioNumber,
                    para: fixed,
                    mensagem: msg,
                    horario: moment().format('YYYY-MM-DD HH:mm'),
                    status: messageTwilio.status,
                    sid: messageTwilio.sid
                })

                return res.json(msg)
            }
            io.emit('receivedMessage', { whatsapp: fixed, mensagem, responsavel: find?.responsavelConversa, enfermeiro: find?.enfermeiro, nome: find?.nome, proposta: find?.proposta })
            const wppSender = find.wppSender
            await PropostaEntrevista.findByIdAndUpdate({
                _id: find._id
            }, {
                visualizado: true
            })
            if (find.status === 'Concluído') {
                const msg = "Atendimento encerrado, a Amil agradece"
                const messageTwilio = await client.messages.create({
                    from: wppSender,
                    body: msg,
                    to: from
                })
                await Chat.create({
                    de: wppSender,
                    para: fixed,
                    mensagem: msg,
                    horario: moment().format('YYYY-MM-DD HH:mm'),
                    status: messageTwilio.status,
                    sid: messageTwilio.sid
                })
                return res.json(msg)
            }
            if (find.situacao === 'Janela escolhida') {
                return res.json({
                    msg: 'janela ja escolhida'
                })
            }
            if (find.agendado === 'agendado') {
                return res.json({
                    msg: 'Agendado'
                })
            }
            if (isNaN(Number(mensagem))) {
                if (find.atendimentoHumanizado) {
                    return res.json(mensagem)
                }
                if (!find.perguntaAtendimentoHumanizado) {
                    await PropostaEntrevista.findOneAndUpdate({
                        cpfTitular: find.cpfTitular
                    }, {
                        perguntaAtendimentoHumanizado: true
                    })
                    const msg = `Não entendemos sua resposta, por favor digite somente o *número* referente a janela de horário que o Sr.(a) prefere.`
                    const messageTwilio = await client.messages.create({
                        from: wppSender,
                        body: msg,
                        to: from
                    })
                    await Chat.create({
                        de: wppSender,
                        para: fixed,
                        mensagem: msg,
                        horario: moment().format('YYYY-MM-DD HH:mm'),
                        status: messageTwilio.status,
                        sid: messageTwilio.sid
                    })

                    return res.json(msg)
                }
                if (find.perguntaAtendimentoHumanizado) {
                    await PropostaEntrevista.updateMany({
                        cpfTitular: find.cpfTitular
                    }, {
                        atendimentoHumanizado: true
                    })
                    const msg = 'Um dos nossos atendentes irá entrar em contato para realizar o agendamento.'
                    const messageTwilio = await client.messages.create({
                        from: wppSender,
                        body: msg,
                        to: from
                    })
                    await Chat.create({
                        de: wppSender,
                        para: fixed,
                        mensagem: msg,
                        horario: moment().format('YYYY-MM-DD HH:mm'),
                        status: messageTwilio.status,
                        sid: messageTwilio.sid
                    })
                    return res.json(msg)
                }
                const msg = 'Nao respondeu corretamente'
                return res.json(msg)
            }

            if (find.modelo === '1') {
                switch (Number(mensagem)) {
                    case 1:
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 13:00 às 15:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 2:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 15:00 às 17:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 3:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 17:00 às 19:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 4:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 09:00 às 11:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 5:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 11:00 às 13:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 6:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 13:00 às 15:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 7:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 15:00 às 17:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 8:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 17:00 às 19:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    default:
                        break
                }
                await PropostaEntrevista.updateMany({
                    cpfTitular: find.cpfTitular
                }, {
                    newStatus: 'Janela escolhida'
                })
                return res.json(mensagem)
            }
            if (find.modelo === '2') {
                switch (Number(mensagem)) {
                    case 1:
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 09:00 às 11:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 2:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 11:00 às 13:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 3:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 13:00 às 15:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 4:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 15:00 às 17:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 5:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 17:00 às 19:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 6:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 09:00 às 11:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 7:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 11:00 às 13:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 8:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 13:00 às 15:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 9:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 15:00 às 17:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 10:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 17:00 às 19:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    default:
                        break
                }
                await PropostaEntrevista.updateMany({
                    cpfTitular: find.cpfTitular
                }, {
                    newStatus: 'Janela escolhida'
                })
                return res.json(mensagem)
            }
            return res.json({ msg: 'ok' })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    newWebHook: async (req, res) => {
        try {

            

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    }
}