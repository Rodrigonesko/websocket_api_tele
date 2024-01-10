const PropostaEntrevista = require('../models/PropostaEntrevista');
const Chat = require('../models/Chat');
const moment = require('moment');
require('moment-business-days')
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const TwilioNumber = process.env.TWILIO_NUMBER
const { modeloMensagem1, modeloMensagem2, buscarDiasDisponiveis, buscarHorariosDisponiveis, enfermeiraComMenosAgendamentos, verificarHorarioDisponivel, horariosDisponiveis, verificarDependentesMenoresDeIdade } = require('../utils/functions')
const { sendMessage, updatePropostaEntrevista, agendaEntrevistaPorCpfTitular, agendaEntrevistaPorId, encontrarPropostaPorWhatsapp, mandarParaAtendimentoHumanizado, agendaComOStatusPerguntaDependentes, agendarEntrevistaParaDependentesMenoresIdade } = require('../utils/whatsappBotFunctions')
const { io } = require('../../index');

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

            let { Body, From, To } = req.body

            if (From.length === 22) {
                let primeiraParte = From.slice(0, 14)
                let segundaParte = From.slice(14)
                From = `${primeiraParte}9${segundaParte}`
            }
            await Chat.create({
                de: From,
                para: To,
                mensagem: Body,
                horario: moment().format('YYYY-MM-DD HH:mm'),
            })
            let find = await encontrarPropostaPorWhatsapp(From)
            //Verifica se esta no atendimento humazizado
            if (isNaN(Number(Body)) && find?.atendimentoHumanizado) {
                return res.json(Body)
            }
            if (find) {
                if (!find.statusWhatsapp) {
                    const msg = `Prezado Sr. (a) ${find.nome},
Somos da Área de Implantação da Amil e para concluirmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) precisamos confirmar alguns dados médicos.
Por gentileza, poderia responder essa mensagem para podermos seguir com o atendimento?`
                    await sendMessage(To, From, msg)
                    await updatePropostaEntrevista(find, 'Saudacao enviada')
                    return res.json(msg)
                }
            }
            //Verifica se ja foi agendado
            if (find?.statusWhatsapp === 'Horario confirmado') {
                const msg = "Seu horário já foi confirmado, caso precise reagendar, a central de atendimento irá entrar em contato."
                await sendMessage(To, From, msg)
                await mandarParaAtendimentoHumanizado(find)
                return res.json(msg)
            }
            //Caso não o whatsapp não tenha sido encontrado no banco, verifica se o cpf foi digitado
            if ((Body.length === 11) && !isNaN(Number(Body)) && !find) {
                find = await PropostaEntrevista.findOneAndUpdate({
                    cpf: Number(Body),
                    status: { $ne: 'Cancelado', $ne: 'Concluído' }
                }, {
                    whatsapp: From,
                    wppSender: To,
                    statusWhatsapp: 'Cpf digitado',
                });
                find = await PropostaEntrevista.findOne({
                    cpf: Number(Body),
                    status: { $ne: 'Cancelado', $ne: 'Concluído' }
                });
                if (!find) {
                    const msg = 'Olá, seu CPF não consta em nossa base de contatos, por favor verifique se o mesmo foi digitado corretamente e tente novamente.'
                    await sendMessage(To, From, msg)
                    return res.json(msg)
                }
            }
            //Caso o cpf tenha sido digitado e o whatsapp encontrado no banco, é enviado os dias disponiveis
            if ((!isNaN(Number(Body)) && (find?.statusWhatsapp === 'Cpf digitado')) || find?.statusWhatsapp === 'Saudacao enviada') {
                const diasDisponiveis = await buscarDiasDisponiveis()
                const msg = `Olá, por gentileza escolha o dia em que o Sr (a) ${find.nome} deseja realizar a entrevista.\nDigite somente o número referente ao dia escolhido.\n${diasDisponiveis.map((dia, index) => {
                    return `${index + 1}. ${moment(dia).format('DD/MM/YYYY')}`
                }).join('\n')}`
                await sendMessage(To, From, msg)
                const update = await PropostaEntrevista.findByIdAndUpdate({
                    _id: find._id
                }, {
                    statusWhatsapp: 'Dia enviado',
                    diasEnviados: diasDisponiveis,
                })
            }
            //Caso não seja digitado um numero e o whatsapp é encontrado no banco, é enviado a mensagem de atendimento humanizado
            if ((isNaN(Number(Body)) && !find?.atendimentoHumanizado && !find?.perguntaAtendimentoHumanizado && !!find) && (Body !== 'Ok' && find?.statusWhatsapp !== 'Saudacao enviada')) {
                const msg = 'Infelizmente ainda não entendemos sua mensagem, por favor siga as instruções informadas acima.'
                await sendMessage(To, From, msg)
                await PropostaEntrevista.updateOne({
                    _id: find._id
                }, {
                    perguntaAtendimentoHumanizado: true
                })
                return res.json(msg)
            }
            //Caso não seja digitado um numero e o whatsapp é encontrado no banco, é enviado para o atendimento humanizado
            if (isNaN(Number(Body)) && !find?.atendimentoHumanizado && find?.perguntaAtendimentoHumanizado && !!find) {
                const msg = 'Infelizmente ainda não entendemos sua mensagem, um analista irá entrar em contato para realizar o agendamento.'
                await sendMessage(To, From, msg)
                await mandarParaAtendimentoHumanizado(find)
                return res.json(msg)
            }
            //Caso não for encontrado o whatsapp, é enviado a mensagem perguntado o cpf
            if (!find) {
                const msg = 'Olá, por favor nos informe seu CPF (Somente números) para que possamos verificar se você possui uma proposta em aberto.'
                await sendMessage(To, From, msg)
                return res.json(msg)
            }
            //Retorna os horarios disponiveis
            if (find.statusWhatsapp === 'Dia enviado' && !isNaN(Number(Body))) {
                const horariosDisponiveis = await buscarHorariosDisponiveis(find.diasEnviados[Number(Body) - 1])
                if (!find.diasEnviados[Number(Body) - 1]) {
                    const msg = `Por favor escolha um dia válido.`
                    await sendMessage(To, From, msg)
                    return res.json({ msg: 'ok' })
                }
                if (horariosDisponiveis.length === 0) {
                    const msg = `Infelizmente não temos horários disponíveis para o dia ${moment(find.diasEnviados[Number(Body) - 1]).format('DD/MM/YYYY')}, por favor escolha outro dia.`
                    await sendMessage(To, From, msg)
                    return res.json({ msg: 'ok' })
                }
                const msg = `Por gentileza escolha o horário em que o Sr (a) deseja realizar a entrevista.\nDigite somente o número referente ao horário escolhido.\n${horariosDisponiveis.map((horario, index) => {
                    return `${index + 1}. ${horario}`
                }).join('\n')}`
                await sendMessage(To, From, msg)
                const update = await PropostaEntrevista.findByIdAndUpdate({
                    _id: find._id
                }, {
                    statusWhatsapp: 'Horario enviado',
                    horariosEnviados: horariosDisponiveis,
                    diaEscolhido: find.diasEnviados[Number(Body) - 1]
                })
                return res.json({ msg: 'ok' })
            }
            //Retorna a mensagem de confirmação de horario
            if (find.statusWhatsapp === 'Horario enviado' && !isNaN(Number(Body))) {
                const horarioEscolhido = find.horariosEnviados[Number(Body) - 1]
                if (!horarioEscolhido) {
                    const msg = `Por favor escolha um horário válido.`
                    await sendMessage(To, From, msg)
                    return res.json({ msg: 'ok' })
                }
                const horarioDisponivel = await verificarHorarioDisponivel(find.diaEscolhido, horarioEscolhido)
                if (!horarioDisponivel) {
                    const msg = `O horário escolhido não está mais disponível, por favor escolha outro horário.`
                    await sendMessage(To, From, msg)
                    return res.json({ msg: 'ok' })
                }
                const msg = `Por gentileza confirme o dia e horário escolhido para a entrevista.\n${moment(find.diaEscolhido).format('DD/MM/YYYY')} ${horarioEscolhido}\nDigite 1 para confirmar ou 2 para escolher outro horário.`
                await sendMessage(To, From, msg)
                const update = await PropostaEntrevista.findByIdAndUpdate({
                    _id: find._id
                }, {
                    statusWhatsapp: 'Confirmação de horario',
                    horarioEscolhido,
                    horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                })
                return res.json({ msg: 'ok' })
            }
            //Caso o horario seja confirmado, é enviado mensagem de dependentes
            if (find.statusWhatsapp === 'Confirmação de horario' && !isNaN(Number(Body))) {
                if (Number(Body) === 1) {
                    const dependentes = await PropostaEntrevista.find({
                        cpfTitular: find.cpfTitular,
                        tipoAssociado: 'Dependente',
                        status: { $ne: 'Cancelado', $ne: 'Concluído' }
                    })
                    const enfermeira = await enfermeiraComMenosAgendamentos(find.horarioEscolhido, find.diaEscolhido)
                    if (find.tipoAssociado === 'Titular' && dependentes.length > 0) {
                        // await agendaComOStatusPerguntaDependentes(find, enfermeira)
                        await agendaEntrevistaPorId(find, enfermeira)
                        const msg = `Agradecemos a confirmação do horário, a entrevista será realizada no dia ${moment(find.diaEscolhido).format('DD/MM/YYYY')}, às ${find.horarioEscolhido}.`  //Lembrando que caso tenha dependentes, a entrevista será realizada com o responsável legal, não necessitando da presença do menor no momento da ligação. Gostaria de agendar os dependentes maiores de idade no mesmo horario?\n1 - sim\n2 - não.`
                        await sendMessage(To, From, msg)
                        if (dependentes.length > 0) {
                            const msg = `Foi detectado que o Sr (a) possui os seguintes depentendes:\n${dependentes.map(dependente => {
                                return `${dependente.nome} - cpf: ${dependente.cpf || 'Não informado'}`
                            }).join('\n')}\nPoderia encaminhar esse link para os dependentes maiores de idade, para que os mesmos agendem seus horários?`
                            await sendMessage(To, From, msg)
                            const link = `https://wa.me/${To.replace('whatsapp:', '')}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista.`
                            await sendMessage(To, From, link)
                            const menoresIdade = await verificarDependentesMenoresDeIdade(find.cpfTitular)
                            if (menoresIdade.length > 0) {
                                for (const dependente of menoresIdade) {
                                    await agendarEntrevistaParaDependentesMenoresIdade(find, dependente)
                                }
                                const msg = `Foi agendado os seguintes dependentes menores de idade para o mesmo horário do Sr (a):\n${menoresIdade.map(dependente => {
                                    return `${dependente.nome} - cpf: ${dependente.cpf || 'Não informado'}`
                                }).join('\n')}\nLembrando que a entrevista será realizada com o responsável legal, não necessitando da presença do menor no momento da ligação.`
                                await sendMessage(To, From, msg)
                            }
                        }
                        return res.json({ msg: 'ok' })
                    } else {
                        await agendaEntrevistaPorId(find, enfermeira)
                        const msg = `Agradecemos a confirmação do horário, a entrevista será realizada no dia ${moment(find.diaEscolhido).format('DD/MM/YYYY')} ${find.horarioEscolhido}, às ${find.horarioEscolhido}.`
                        await sendMessage(To, From, msg)
                        return res.json({ msg: 'ok' })
                    }
                }
                if (Number(Body) === 2) {
                    const diasDisponiveis = await buscarDiasDisponiveis()
                    const msg = `Por gentileza escolha o dia em que o Sr (a) deseja realizar a entrevista.\nDigite somente o número referente ao dia escolhido.\n${diasDisponiveis.map((dia, index) => {
                        return `${index + 1}. ${moment(dia).format('DD/MM/YYYY')}`
                    }).join('\n')}`
                    await sendMessage(To, From, msg)
                    const update = await PropostaEntrevista.findByIdAndUpdate({
                        _id: find._id
                    }, {
                        statusWhatsapp: 'Dia enviado',
                        diasEnviados: diasDisponiveis,
                    })
                }
                return res.json({ msg: 'ok' })
            }
            //Caso a resposta da pergunta dos dependentes seja sim, é enviado a mensagem de confirmação de horario
            if (find.statusWhatsapp === 'Pergunta dependentes' && !isNaN(Number(Body))) {
                if (Number(Body) === 1) {
                    const msg = `Agendamento, realizado com sucesso, agradecemos a confirmação do horário, a entrevista será realizada no dia ${moment(find.diaEscolhido).format('DD/MM/YYYY')}, às ${find.horarioEscolhido}. Lembrando que caso tenha dependentes, a entrevista será realizada com o responsável legal, não necessitando da presença do menor no momento da ligação. Amil agradece.`
                    await sendMessage(To, From, msg)
                    await agendaEntrevistaPorCpfTitular(find, find.enfermeiro)
                    return res.json({ msg: 'ok' })
                }
                if (Number(Body) === 2) {
                    const msg = `Por favor, caso tenha dependentes maiores de idade, passe esse link para os dependentes, para os mesmos agendarem seus horarios.`
                    await sendMessage(To, From, msg)
                    const link = `https://wa.me/${To.replace('whatsapp:', '')}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista.`
                    await sendMessage(To, From, link)
                    await updatePropostaEntrevista(find, 'Horario confirmado')
                    return res.json({ msg: 'ok' })
                }
            }
            return res.json({ msg: 'Nao entrou em nenhum if' })
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    sendMessageSaudacao: async (req, res) => {

        try {

            const { _id } = req.body

            const proposta = await PropostaEntrevista.findOne({
                _id
            })

            const msg = `Prezado Sr. (a) ${proposta.nome},
Somos da Área de Implantação da Amil e para concluirmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) precisamos confirmar alguns dados médicos.
Por gentileza, poderia responder essa mensagem para podermos seguir com o atendimento?`

            const messageTwilio = await client.messages.create({
                from: 'whatsapp:+15752234727',
                body: msg,
                to: proposta.whatsapp
            })

            await Chat.create({
                de: 'whatsapp:+15752234727',
                para: proposta.whatsapp,
                mensagem: msg,
                horario: moment().format('YYYY-MM-DD HH:mm'),
                status: messageTwilio.status,
                sid: messageTwilio.sid
            })

            const update = await PropostaEntrevista.findByIdAndUpdate({
                _id
            }, {
                statusWhatsapp: 'Saudacao enviada',
            })

            return res.json({ msg: 'ok' })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }

    },

    teste: async (req, res) => {
        try {

            const result = await horariosDisponiveis('2024-01-03', 2)
            console.log(result);

            //console.log(Body, From, To, ProfileName);

            return res.json({ msg: 'ok' })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    }
}