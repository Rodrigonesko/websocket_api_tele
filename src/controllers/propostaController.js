const PropostaEntrevista = require('../models/PropostaEntrevista')
const Chat = require('../models/Chat')
const moment = require('moment')
require('moment-business-days')
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const TwilioNumber = process.env.TWILIO_NUMBER
const TwilioNumberPme = process.env.TWILIO_NUMBER_PME
const TwilioNumberSP = process.env.TWILIO_NUMBER_SP
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const { io } = require('../../index')

module.exports = {
    upload: async (req, res) => {
        try {
            const { result } = req.body

            console.log(result)

            let quantidade = 0

            const arrCpfTitulares = result.reduce((acc, item) => {
                let numPropostas = []

                result.forEach(e => {
                    const proposta = e.NUM_PROPOSTA
                    const tipoAssociado = e.TIPO_ASSOCIADO
                    const itemExistente = numPropostas.find((elem) => elem.proposta === proposta)
                    if (itemExistente) {
                        if (tipoAssociado === 'Titular') {
                            itemExistente.numTitulares += 1
                            itemExistente.numAssociados += 1
                            itemExistente.cpfTitular = e.NUM_CPF
                        } else {
                            itemExistente.numAssociados += 1
                        }
                    } else if (tipoAssociado === "Titular") {
                        numPropostas.push({ proposta: proposta, numTitulares: 1, numAssociados: 1, cpfTitular: e.NUM_CPF })
                    } else {
                        numPropostas.push({ proposta: proposta, numAssociados: 1, numTitulares: 0 })
                    }
                })

                const itemExistenteAssociados = numPropostas.find((elem) => elem.proposta === item.NUM_PROPOSTA)
                if (itemExistenteAssociados.numTitulares !== 1 && itemExistenteAssociados.numTitulares !== itemExistenteAssociados.numAssociados) {
                    console.log('problema no numero de titulares', item.NUM_PROPOSTA, item.NOME_ASSOCIADO, itemExistenteAssociados.numTitulares);
                    acc.push({ ...item });
                    return acc;
                }

                if (item.TIPO_ASSOCIADO === 'Titular') {
                    item.cpfTitular = item.NUM_CPF
                } else {
                    const itemExistente = numPropostas.find((element) => element.proposta === item.NUM_PROPOSTA)
                    item.cpfTitular = itemExistente.cpfTitular
                }
                acc.push({ ...item });
                return acc;

            }, [])

            for (const item of arrCpfTitulares) {

                const proposta = item.NUM_PROPOSTA

                let vigencia = ExcelDateToJSDate(item.DT_VENDA)
                vigencia.setDate(vigencia.getDate() + 1)
                vigencia = moment(vigencia).format('YYYY-MM-DD')

                const filial = item.FILIAL

                const riscoBeneficiario = item.RISCO_BENEF

                const riscoImc = item.RISCO_IMC

                const sinistral = item.SINISTRALIDADE_ANT

                const liminar = item.LIMINAR_ANT

                const fraude = item.FRAUDE_ANT

                const propCancel = item.PROP_CANCEL_UNDER_ANT

                const sinistContr = item.SINIST_CONTR_ANT

                const corretora = item.CORRETORA

                const corretor = item.CORRETOR

                const cpf = item.NUM_CPF

                const nome = item.NOME_ASSOCIADO

                const sexo = item.SEXO

                const tipoAssociado = item.TIPO_ASSOCIADO

                const tipoContrato = item.TIPO_CONTRATO

                const nomeOperadora = item.NOM_OPERADORA

                vigencia = moment().businessAdd(2).format('YYYY-MM-DD')

                const grupoCarencia = item.GRUPO_CARENCIA

                const d1 = item.DS_1
                const d2 = item.DS_2
                const d3 = item.DS_3
                const d4 = item.DS_4
                const d5 = item.DS_5
                const d6 = item.DS_6
                const d7 = item.DS_7
                const d8 = item.DS_8
                const d9 = item.DS_9

                const peso = item.PESO
                const altura = item.ALTURA
                const imc = item.IMC

                const cid1 = item.CID_PI_ANT_1
                const cid2 = item.CID_PI_ANT_2
                const cid3 = item.CID_PI_ANT_3

                let wppSender = TwilioNumber

                if (tipoContrato.toLowerCase().indexOf('pme') !== -1) {
                    wppSender = TwilioNumberPme
                }

                const observacao = item['OBSERVAÇÕES']
                const ddd = item.NUM_DDD_CEL || item.NUM_DDD_TEL
                let numero = item.NUM_CEL?.toString().replace(/\s/g, '') || item.NUM_TEL?.toString().replace(/\s/g, '')
                const telefone = `(${ddd}) ${numero}`

                if (ddd == '11') {
                    wppSender = TwilioNumberSP
                }

                if (numero?.length !== 9 && numero !== undefined) {
                    numero = `9${numero}`
                    console.log(numero);
                }

                const celularCompleto = `55${ddd}${numero}`
                let whatsapp = `whatsapp:+55${ddd}${numero}`
                whatsapp = whatsapp.replace(/\s/g, '')

                let dataNascimento

                if (typeof (item.DT_NASC) === 'number') {
                    dataNascimento = ExcelDateToJSDate(item.DT_NASC)
                    dataNascimento.setDate(dataNascimento.getDate() + 1)
                    dataNascimento = moment(dataNascimento).format('DD/MM/YYYY')
                    idade = calcularIdade(dataNascimento)
                } else {
                    dataNascimento = item.DT_NASC
                    dataNascimento = dataNascimento.replace(' ', '')
                    idade = calcularIdade(dataNascimento)
                }

                let formulario

                if (idade <= 2) {
                    formulario = '0-2 anos'
                }

                if (idade >= 3 && idade <= 8) {
                    formulario = '2-8 anos'
                }

                if (idade >= 9) {
                    formulario = 'adulto'
                }

                const cpfTitular = item.cpfTitular

                let situacao = 'A enviar'

                if (!cpfTitular) {
                    situacao = 'Corrigir'
                }

                console.log(wppSender);

                const resultado = {
                    dataRecebimento: moment().format('YYYY-MM-DD'),
                    proposta,
                    filial,
                    riscoBeneficiario,
                    riscoImc,
                    sinistral,
                    liminar,
                    fraude,
                    propCancel,
                    sinistContr,
                    corretora,
                    corretor,
                    cpf,
                    nome,
                    sexo,
                    dataNascimento,
                    idade,
                    d1,
                    d2,
                    d3,
                    d4,
                    d5,
                    d6,
                    d7,
                    d8,
                    d9,
                    observacao,
                    vigencia,
                    telefone,
                    grupoCarencia,
                    peso,
                    altura,
                    imc,
                    cid1,
                    cid2,
                    cid3,
                    tipoAssociado,
                    tipoContrato,
                    formulario,
                    situacao,
                    cpfTitular,
                    ddd,
                    celular: numero,
                    whatsapp,
                    celularCompleto,
                    nomeOperadora,
                    wppSender
                }

                const existeProposta = await PropostaEntrevista.findOne({
                    proposta,
                    nome
                })

                if (!existeProposta) {
                    const newPropostaEntrevista = await PropostaEntrevista.create(resultado)
                    quantidade++
                }

            }

            return res.status(200).json({ message: `Foram inseridas ${quantidade} novas propostas!` })
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                error: "Internal server error."
            })
        }
    },

    show: async (req, res) => {
        try {
            const propostas = await PropostaEntrevista.find()

            return res.status(200).json({
                propostas
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                error: "Internal server error."
            })
        }
    },

    buscarDadosEntreDatas: async (req, res) => {
        try {

            const { startDate, endDate, tipoRelatorio } = req.query

            console.log(startDate, endDate, tipoRelatorio);
            let result

            if (tipoRelatorio === 'Data Conclusão') {
                result = await PropostaEntrevista.find({
                    dataConclusao: {
                        $gte: startDate || '2022-09-01',
                        $lte: endDate || moment().format('YYYY-MM-DD')
                    }
                })
            } else {
                result = await PropostaEntrevista.find({
                    dataRecebimento: {
                        $gte: startDate || '2022-09-01',
                        $lte: endDate || moment().format('YYYY-MM-DD')
                    }
                })
            }

            console.log(result.length);

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                error: "Internal server error."
            })
        }
    },

    buscarPropostasNaoRealizadas: async (req, res) => {
        try {

            const propostas = await PropostaEntrevista.find({
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } }
                ]
            })

            return res.status(200).json({
                propostas
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    mostrarPropostaPorId: async (req, res) => {
        try {

            const { id } = req.params

            const dadosProposta = await PropostaEntrevista.findById({
                _id: id
            })

            return res.json(dadosProposta)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    agendar: async (req, res) => {
        try {

            const { id, dataEHora, responsavel, quemAgendou } = req.body

            const updateTele = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                dataEntrevista: dataEHora,
                agendado: 'agendado',
                enfermeiro: responsavel,
                quemAgendou: quemAgendou,
            })

            return res.json(updateTele)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    reagendar: async (req, res) => {
        try {

            const { id } = req.body

            const reagendar = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                dataEntrevista: '',
                agendado: '',
                enfermeiro: '',
                lembrete: false
            })

            return res.json(reagendar)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    cancelar: async (req, res) => {
        try {

            const { id } = req.body

            const proposta = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                status: 'Cancelado',
                dataConclusao: moment().format('YYYY-MM-DD')
            })

            return res.json(proposta)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    delete: async (req, res) => {
        try {

            const { id } = req.params

            const remove = await PropostaEntrevista.findByIdAndDelete({
                _id: id
            })

            return res.json(remove)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    alterarTelefone: async (req, res) => {
        try {

            const { id, telefone } = req.body

            console.log(id, telefone);

            const result = await PropostaEntrevista.findOneAndUpdate({
                _id: id
            }, {
                telefone: telefone
            })

            console.log(result);

            return res.status(200).json({
                result
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    alterarWhatsapp: async (req, res) => {
        try {

            const { _id, whatsapp } = req.body

            if (!_id || !whatsapp) {
                return res.status(500).json({ msg: 'Sem dados no corpo da requisição' })
            }

            const find = await PropostaEntrevista.findOne({
                _id
            })

            await PropostaEntrevista.updateOne({
                _id
            }, {
                whatsapp,
                $push: {
                    whatsappsAnteriores: find.whatsapp
                }
            })

            return res.json({
                msg: 'ok'
            })


        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    agendadas: async (req, res) => {
        try {

            const propostas = await PropostaEntrevista.find({
                agendado: 'agendado',
                $or: [
                    { status: '' },
                    { status: undefined }
                ]
            }).sort('dataEntrevista')

            return res.json(propostas)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    naoAgendadas: async (req, res) => {
        try {

            console.log('chaamou');

            const propostas = await PropostaEntrevista.find({
                $and: [
                    { agendado: { $ne: 'agendado' } },
                    { status: { $nin: ['Concluído', 'Cancelado'] } }
                ]
            }).sort('vigencia')

            return res.status(200).json({
                propostas,
                total: propostas.length
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    alterarVigencia: async (req, res) => {
        try {

            const { id, vigencia } = req.body

            const proposta = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                vigencia
            })

            return res.json(proposta)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    alterarFormulario: async (req, res) => {
        try {

            const { id, formulario } = req.body

            if (formulario === 'adulto-f') {
                const proposta = await PropostaEntrevista.findByIdAndUpdate({
                    _id: id
                }, {
                    formulario: 'adulto',
                    sexo: 'F'
                })

                return res.status(200).json(proposta)
            }

            if (formulario === 'adulto-m') {
                const proposta = await PropostaEntrevista.findByIdAndUpdate({
                    _id: id
                }, {
                    formulario: 'adulto',
                    sexo: 'M'
                })

                return res.status(200).json(proposta)
            }

            const proposta = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                formulario
            })

            return res.status(200).json(proposta)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    alterarSexo: async (req, res) => {
        try {

            const { id, sexo } = req.body

            const proposta = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                sexo
            })

            return res.status(200).json(proposta)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    migrarRet: async (req, res) => {
        try {

            const { proposta, nome } = req.body

            console.log(proposta, nome);

            await PropostaEntrevista.updateOne({
                proposta,
                nome
            }, {
                retrocedido: 'Ret'
            })

            return res.json({
                msg: 'ok'
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    voltarEntrevista: async (req, res) => {
        try {

            const { nome, proposta } = req.body

            const result = await PropostaEntrevista.findOneAndUpdate({
                nome,
                proposta
            }, {
                status: '',
                retrocedido: 'Ret'
            })

            res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    tentativaContato: async (req, res) => {
        try {

            const { tentativa, id } = req.body

            switch (tentativa) {
                case 'tentativa 1':
                    await PropostaEntrevista.findByIdAndUpdate({
                        _id: id
                    }, {
                        responsavelContato1: req.user,
                        contato1: moment().format('DD/MM/YYYY HH:mm:ss')
                    })
                    break;
                case 'tentativa 2':
                    await PropostaEntrevista.findByIdAndUpdate({
                        _id: id
                    }, {
                        responsavelContato2: req.user,
                        contato2: moment().format('DD/MM/YYYY HH:mm:ss')
                    })
                    break;
                case 'tentativa 3':
                    await PropostaEntrevista.findByIdAndUpdate({
                        _id: id
                    }, {
                        responsavelContato3: req.user,
                        contato3: moment().format('DD/MM/YYYY HH:mm:ss')
                    })
                    break;
                default:
                    break;
            }

            return res.json({
                msg: 'Tentativa de contato feita com sucesso'
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    concluir: async (req, res) => {
        try {

            const { id, houveDivergencia, cids, divergencia } = req.body

            const updateProposta = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                status: 'Concluído',
                anexadoSisAmil: 'Anexar',
                houveDivergencia,
                divergencia,
                cids,
                dataConclusao: moment().format('YYYY-MM-DD'),
                enfermeiro: req.user
            })

            return res.json(updateProposta)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    naoEnviadas: async (req, res) => {
        try {

            const propostas = await PropostaEntrevista.find({
                situacao: 'A enviar'
            })

            return res.json(propostas)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    propostasAAjustar: async (req, res) => {
        try {

            const propostas = await PropostaEntrevista.find({
                situacao: 'Corrigir'
            })

            return res.json(propostas)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    ajustarCpf: async (req, res) => {
        try {
            const { propostas } = req.body

            for (const item of propostas) {
                await PropostaEntrevista.findByIdAndUpdate({
                    _id: item.id
                }, {
                    cpfTitular: item.cpfTitular,
                    situacao: 'A enviar'
                })
            }

            return res.json(propostas)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    voltarAjuste: async (req, res) => {
        try {

            const { id } = req.body

            const result = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                situacao: 'Corrigir',
                cpfTitular: null
            })

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

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

            // if (proposta.situacao !== 'A enviar') {
            //     return res.json({ msg: 'Não ajustado' })
            // }

            let whatsapp = proposta.whatsapp


            // const verificar = await PropostaEntrevista.findOne({
            //     _id: proposta._id,
            //     situacao: 'Enviado',
            //     naoEnviar: true
            // })

            // if (verificar) {
            //     console.log('ja foi enviado');
            //     return res.json({ msg: 'Ja foi enviado' })
            // }

            const result = await client.messages.create({
                from: wppSender,
                body: mensagem,
                to: whatsapp
            })

            const verificarStatusMensagem = await client.messages(result.sid).fetch()

            if (verificarStatusMensagem.status === 'undelivered') {
                console.log('Problema ao enviar');
                const update = await PropostaEntrevista.updateMany({
                    cpfTitular: proposta.cpfTitular
                }, {
                    situacao: 'Problemas ao Enviar'
                })
                return res.json({ msg: 'Problemas ao Enviar' })
            }

            if (verificarStatusMensagem.status === 'failed') {
                console.log('Sem whatsapp');
                const update = await PropostaEntrevista.updateMany({
                    cpfTitular: proposta.cpfTitular
                }, {
                    situacao: 'Sem whatsapp'
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
            })

            const mensagemBanco = await Chat.create({
                de: wppSender,
                para: whatsapp,
                mensagem,
                horario: moment().format('YYYY-MM-DD HH:mm'),
                stattus: verificarStatusMensagem.status,
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

    situacao: async (req, res) => {
        try {

            const { situacao } = req.params

            const result = await PropostaEntrevista.find({
                situacao,
                agendado: { $ne: 'agendado' },
                atendimentoHumanizado: { $ne: true }
            })

            return res.json(result)

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

            io.emit('receivedMessage', { whatsapp: fixed })

            await Chat.create({
                de: fixed,
                para: TwilioNumber,
                mensagem,
                horario: moment().format('YYYY-MM-DD HH:mm')
            })

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
                        console.log(`Das 13:00 às 15:00`, find.opcaoDia1);
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
                        console.log(`Das 15:00 às 17:00`, find.opcaoDia1);
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
                        console.log(`Das 17:00 às 19:00`, find.opcaoDia1);
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
                        console.log(`Das 09:00 às 11:00`, find.opcaoDia2);
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
                        console.log(`Das 11:00 às 13:00`, find.opcaoDia2);
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
                        console.log(`Das 13:00 às 15:00`, find.opcaoDia2);
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
                        console.log(`Das 15:00 às 17:00`, find.opcaoDia2);
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
                        console.log(`Das 17:00 às 19:00`, find.opcaoDia2);
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

                return res.json(mensagem)
            }

            if (find.modelo === '2') {
                switch (Number(mensagem)) {
                    case 1:
                        console.log(`Das 09:00 às 11:00`, find.opcaoDia1);
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
                        console.log(`Das 11:00 às 13:00`, find.opcaoDia1);
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
                        console.log(`Das 13:00 às 15:00`, find.opcaoDia1);
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
                        console.log(`Das 15:00 às 17:00`, find.opcaoDia1);
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
                        console.log(`Das 17:00 às 19:00`, find.opcaoDia1);
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
                        console.log(`Das 09:00 às 11:00`, find.opcaoDia2);
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
                        console.log(`Das 11:00 às 13:00`, find.opcaoDia2);
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
                        console.log(`Das 13:00 às 15:00`, find.opcaoDia2);
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
                        console.log(`Das 15:00 às 17:00`, find.opcaoDia2);
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
                        console.log(`Das 17:00 às 19:00`, find.opcaoDia2);
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

                return res.json(mensagem)
            }

            return res.json({ msg: 'oi' })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    testeMensagem: async (req, res) => {
        try {

            let mensagem = modeloMensagem2('RODRIGO ONESKO DIAS', '26/04/2023', '27/04/2023').mensagem

            console.log(mensagem);

            const result = await client.messages.create({
                from: TwilioNumberPme,
                body: mensagem,
                to: 'whatsapp:+554197971794'
            })

            console.log(result);

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    problemaEnviar: async (req, res) => {
        try {

            const result = await PropostaEntrevista.find({
                $or: [
                    { situacao: 'Problemas ao Enviar', status: undefined },
                    { situacao: 'Sem whatsapp', status: undefined },

                ]
            })

            return res.json(result)


        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    janelasEscolhidas: async (req, res) => {
        try {

            const result = await PropostaEntrevista.find({
                situacao: 'Janela escolhida'
            }).sort('horarioRespondido')

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    atendimentoHumanizado: async (req, res) => {
        try {

            const result = await PropostaEntrevista.find({
                atendimentoHumanizado: true,
                status: { $ne: 'Cancelado', $ne: 'Concluído' },
                agendado: { $ne: 'Agendado' }
            })

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    chat: async (req, res) => {
        try {
            const { whatsapp } = req.params

            const chat = await Chat.find({
                $or: [
                    { de: whatsapp },
                    { para: whatsapp }
                ]
            }).sort('horario')

            return res.json(chat)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    conversas: async (req, res) => {
        try {

            const { pesquisa } = req.params

            const propostas = await PropostaEntrevista.find({
                $or: [
                    { whatsapp: { $regex: pesquisa } },
                    { proposta: { $regex: pesquisa } },
                    { nome: { $regex: pesquisa } },
                ]
            })

            return res.json(propostas)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    mandarAtendimentoHumanizado: async (req, res) => {
        try {

            const { id } = req.body

            const result = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                atendimentoHumanizado: true,
                situacao: 'Atendimento humanizado'
            })

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    gerarMensagens: async (req, res) => {
        try {

            const propostas = await PropostaEntrevista.find({
                $and: [
                    { agendado: { $ne: 'agendado' } },
                    { status: { $ne: 'Concluído' } },
                    { status: { $ne: 'Cancelado' } }
                ]
            }).sort('vigencia')

            let arrObj = [

            ]

            for (const item of propostas) {
                const proposta = await PropostaEntrevista.find({
                    $and: [
                        { agendado: { $ne: 'agendado' } },
                        { status: { $ne: 'Concluído' } },
                        { status: { $ne: 'Cancelado' } },
                        { proposta: item.proposta }
                    ]
                })

                if (proposta.length >= 2) {
                    let pessoas = []
                    for (const iterator of proposta) {
                        pessoas.push({
                            nome: iterator.nome,
                            sexo: iterator.sexo,
                            tipoAssociado: iterator.tipoAssociado,
                            telefone: iterator.telefone
                        })
                    }

                    let titular = {
                        nome: '',
                        sexo: '',
                        telefone: '',
                    }

                    let dependentes = []

                    pessoas.forEach(e => {
                        if (e.tipoAssociado === 'Titular' || e.tipoAssociado === 'Titular ') {
                            if (titular.nome !== '') {
                                dependentes.push({
                                    nome: e.nome,
                                    sexo: e.sexo
                                })
                                return
                            }
                            titular.nome = e.nome
                            titular.sexo = e.sexo
                            titular.telefone = e.telefone
                        } else {
                            dependentes.push({
                                nome: e.nome,
                                sexo: e.sexo
                            })
                        }
                    })

                    arrObj.push({
                        proposta: item.proposta,
                        dependentes: dependentes,
                        titular: titular,
                        tipoContrato: item.tipoContrato,
                    })

                } else {
                    arrObj.push({
                        proposta: item.proposta,
                        dependentes: [],
                        titular: {
                            nome: item.nome,
                            sexo: item.sexo,
                            telefone: item.telefone
                        },
                        tipoContrato: item.tipoContrato
                    })
                }
            }

            let msgs = arrObj.map(item => {
                let saudacao = ''
                let parte1 = ''
                let parte2 = ''
                let parte3 = ''
                let parte4 = ''
                let parte5 = []
                let parte6 = ''
                if (item.titular.sexo === 'M') {
                    saudacao = `Prezado Sr. ${item.titular.nome}, `
                    parte1 = `Somos da equipe de elegibilidade da operadora de saúde Amil e para concluirmos a contratação do Plano de Saúde do Sr. e `
                } else {
                    saudacao = `Prezada Sra. ${item.titular.nome}, `
                    parte1 = `Somos da equipe de elegibilidade da operadora de saúde Amil e para concluirmos a contratação do Plano de Saúde da Sra. e `
                }

                item.dependentes.forEach(dependete => {
                    if (dependete.sexo === 'M') {
                        parte2 += `do Sr. ${dependete.nome}, `
                    } else {
                        parte2 += `da Sra. ${dependete.nome}, `
                    }
                })

                parte3 = 'precisamos confirmar alguns dados para que a contratação seja concluída. '

                parte4 = `Por gentileza escolha duas janelas de horários para entrarmos em contato com o Sr.(a)`

                let data1 = moment().format('DD/MM/YYYY')
                let data2 = moment().format('DD/MM/YYYY')
                let diaSemana = moment().format('dddd')

                if (diaSemana === 'Friday') {
                    if (new Date().getTime() > new Date(moment().format('YYYY-MM-DD 13:00'))) {
                        data1 = moment().add(3, 'days').format('DD/MM/YYYY')
                        data2 = moment().add(4, 'days').format('DD/MM/YYYY')
                    } else {
                        data1 = moment().format('DD/MM/YYYY')
                        data2 = moment().add(3, 'days').format('DD/MM/YYYY')
                    }
                } else if (diaSemana === 'Thursday') {
                    if (new Date().getTime() > new Date(moment().format('YYYY-MM-DD 13:00'))) {
                        data1 = moment().add(1, 'day').format('DD/MM/YYYY')
                        data2 = moment().add(4, 'days').format('DD/MM/YYYY')
                    } else {
                        data1 = moment().format('DD/MM/YYYY')
                        data2 = moment().add(1, 'day').format('DD/MM/YYYY')
                    }
                } else {
                    if (new Date().getTime() > new Date(moment().format('YYYY-MM-DD 13:00'))) {
                        data1 = moment().add(1, 'day').format('DD/MM/YYYY')
                        data2 = moment().add(2, 'days').format('DD/MM/YYYY')
                    } else {
                        data1 = moment().format('DD/MM/YYYY')
                        data2 = moment().add(1, 'day').format('DD/MM/YYYY')
                    }
                }

                if (new Date().getTime() > new Date(moment().format('YYYY-MM-DD 13:00'))) {
                    parte5.push(`*${data1}*`, 'Das 09:00 às 11:00', 'Das 11:00 às 13:00', 'Das 13:00 às 15:00', 'Das 15:00 às 17:00', 'Das 17:00 às 19:00', `*${data2}*`, 'Das 09:00 às 11:00', 'Das 11:00 às 13:00', 'Das 13:00 às 15:00', 'Das 15:00 às 17:00', 'Das 17:00 às 19:00')
                } else {
                    parte5.push(`*${data1}*`, 'Das 13:00 às 15:00', 'Das 15:00 às 17:00', 'Das 17:00 às 19:00', `*${data2}*`, 'Das 09:00 às 11:00', 'Das 11:00 às 13:00', 'Das 13:00 às 15:00', 'Das 15:00 às 17:00', 'Das 17:00 às 19:00')
                }

                parte5.push('Qual melhor horário?')

                parte6 = 'Informamos que vamos ligar dos números 11 42404975 ou 42403554, pedimos tirar do spam para evitar bloqueio da ligação.'

                let parte8 = 'Desde já agradecemos.'

                let parte7 = ` Proposta: ${item.proposta}`

                const msg = {
                    saudacao,
                    parte1,
                    parte2,
                    parte3,
                    parte4,
                    parte5,
                    parte6,
                    parte7,
                    parte8,
                    proposta: item.proposta,
                    tipoContrato: item.tipoContrato
                }

                return msg
            })

            setMsg = new Set()

            msgs = msgs.filter((item) => {
                const msgDuplicada = setMsg.has(item.proposta)
                setMsg.add(item.proposta)
                return !msgDuplicada
            })

            return res.status(200).json({
                msgs
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    naoRealizadas: async (req, res) => {
        try {

            const result = await Propostas.find()

            const propostas = result.filter(e => {
                return e.status != 'Concluído' && e.status != 'Cancelado'
            })

            return res.status(200).json({
                propostas
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },


    mandarMensagemTwilio: async (req, res) => {
        try {

            const { whatsapp, mensagem } = req.body

            const result = await client.messages.create({
                from: TwilioNumber,
                body: mensagem,
                to: whatsapp
            })

            console.log(result);

            await Chat.create({
                de: TwilioNumber,
                para: whatsapp,
                mensagem,
                horario: moment().format('YYYY-MM-DD HH:mm'),
                status: result.status,
                sid: result.sid
            })

            return res.json({ msg: 'ok' })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    mandarMensagem: async (req, res) => {
        try {

            const { whatsapp, mensagem } = req.body

            const find = await PropostaEntrevista.findOne({
                whatsapp
            })

            const wppSender = find.wppSender

            const result = await client.messages.create({
                from: wppSender,
                body: mensagem,
                to: whatsapp
            })

            const verificarStatusMensagem = await client.messages(result.sid).fetch()

            if (verificarStatusMensagem.status === 'failed' || verificarStatusMensagem.status === 'undelivered') {
                return res.status(500).json({
                    msg: 'Erro ao enviar'
                })
            }

            await Chat.create({
                de: wppSender,
                para: whatsapp,
                mensagem,
                horario: moment().format('YYYY-MM-DD HH:mm'),
                status: verificarStatusMensagem.status,
                sid: verificarStatusMensagem.sid
            })

            return res.json({ msg: 'ok' })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    ajustar: async (req, res) => {
        try {

            const result = await PropostaEntrevista.updateMany({
                cpfTitular: 'sem'
            }, {
                situacao: ''
            })

            console.log(result.length);

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    encerrarAtendimentoJanela: async (req, res) => {
        try {

            const { id } = req.body

            const result = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                situacao: 'agendado'
            })

            const wppSender = result.wppSender

            if (result.tipoAssociado === 'Dependente') {
                return res.json(result)
            }

            const dependentes = await PropostaEntrevista.find({
                cpfTitular: result.cpfTitular
            })


            let msg = 'Agendado'

            if (dependentes.length > 1) {
                msg = `Agendado. Lembrando que a entrevista é para o Senhor(a) e os dependentes, `
                let count = 0
                for (const e of dependentes) {
                    count++
                    if (e.nome === result.nome) {
                        continue
                    }
                    if (count === dependentes.length - 1) {
                        msg += `Sr (a) ${e.nome}.`
                        continue
                    }
                    msg += `Sr (a) ${e.nome}, `

                }
                msg += ` Caso os mesmos não estejam presentes no seu horário, o Sr (a) pode informar o contato deles durante a realização da sua entrevista para que possamos entrar em contato com os mesmos neste mesmo horário.`
                console.log(msg);

                const messageTwilio = await client.messages.create({
                    to: result.whatsapp,
                    from: wppSender,
                    body: msg
                })

                await Chat.create({
                    para: result.whatsapp,
                    de: wppSender,
                    horario: moment().format('YYYY-MM-DD HH:mm'),
                    mensagem: msg,
                    status: messageTwilio.status,
                    sid: messageTwilio.sid
                })

                return res.json(msg)
            }

            const messageTwilio = await client.messages.create({
                to: result.whatsapp,
                from: wppSender,
                body: msg
            })

            await Chat.create({
                para: result.whatsapp,
                de: wppSender,
                horario: moment().format('YYYY-MM-DD HH:mm'),
                mensagem: msg,
                status: messageTwilio.status,
                sid: messageTwilio.sid
            })
            return res.json('Agendado')


        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    encerrarHumanizado: async (req, res) => {
        try {

            const { id } = req.body

            const result = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                situacao: 'Agendado',
                atendimentoHumanizado: false,
                perguntaAtendimentoHumanizado: true
            })

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    assumirAtendimento: async (req, res) => {
        try {
            const { id } = req.body

            const result = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                responsavelConversa: req.user
            })

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    visualizarMensagem: async (req, res) => {
        try {

            const { whatsapp } = req.body

            const dados = await PropostaEntrevista.findOne({
                whatsapp
            })

            const result = await PropostaEntrevista.updateMany({
                cpfTitular: dados.cpfTitular
            }, {
                visualizado: false
            })

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    reenviarMensagens: async (req, res) => {
        try {

            const { proposta, horarios, dia } = req.body

            const wppSender = proposta.wppSender

            if (proposta.tipoAssociado.match(/[a-zA-Z]+/g).join('') !== 'Titular') {
                return res.json({ msg: 'Dependente' })
            }

            let msg = `Horários disponíveis para o dia ${moment(dia).format('DD/MM/YYYY')}:\n`
            horarios.forEach(e => {
                msg += `${e} - `
            })
            msg += `\nQual o melhor horário?\nCumpre informar que essa entrevista de complementação é necessária para Adesão ao Plano de Saúde, este que permanecerá paralisado o processo até a realização desta entrevista, informar por gentileza qual o melhor horário.`;

            const messageTwilio = await client.messages.create({
                to: proposta.whatsapp,
                from: wppSender,
                body: msg
            })

            await PropostaEntrevista.updateMany({
                cpfTitular: proposta.cpfTitular
            }, {
                perguntaAtendimentoHumanizado: true,
            })

            await Chat.create({
                de: wppSender,
                para: proposta.whatsapp,
                horario: moment().format('YYYY-MM-DD HH:mm:ss'),
                mensagem: msg,
                status: messageTwilio.status,
                sid: messageTwilio.sid
            })

            return res.json(msg)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    reenviarHorariosDisponiveis: async (req, res) => {
        try {

            const { whatsapps, horarios, data } = req.body

            console.log(whatsapps, horarios);

            let mensagem = `Visto que o preenchimento dos horários é feito em tempo real, esse horário já foi preenchido. Vou te passar os horários disponíveis atualizados:\nHorários disponíveis para o dia ${moment(data).format('DD/MM/YYYY')} - `

            console.log(horarios);

            horarios.forEach(horario => {
                mensagem += `${horario} - `
            })

            mensagem += '\nQual o melhor horário?'

            for (const whatsapp of whatsapps) {

                const result = await PropostaEntrevista.findOne({
                    whatsapp
                })

                const { wppSender } = result

                const messageTwilio = await client.messages.create({
                    to: whatsapp,
                    from: wppSender,
                    body: mensagem
                })

                await Chat.create({
                    de: wppSender,
                    para: whatsapp,
                    mensagem,
                    horario: moment().format('YYYY-MM-DD HH:mm:ss'),
                    status: messageTwilio.status,
                    sid: messageTwilio.sid
                })

                const { cpfTitular } = await PropostaEntrevista.findOne({
                    whatsapp
                })

                await PropostaEntrevista.updateMany({
                    cpfTitular
                }, {
                    perguntaAtendimentoHumanizado: true,
                    atendimentoHumanizado: true,
                    situacao: 'Atendimento humanizado'
                })
            }

            return res.json({
                msg: 'ok'
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    alterarDadosProposta: async (req, res) => {
        try {

            const { dados } = req.body

            const result = await PropostaEntrevista.updateOne({
                nome: dados.nomeAntigo,
                proposta: dados.proposta
            }, {
                nome: dados.nome
            })

            return res.json({
                msg: 'ok'
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    propostasParaDevolver: async (req, res) => {
        try {

            const result = await PropostaEntrevista.find({
                $and: [
                    { status: { $ne: 'Concluído' } },
                    { status: { $ne: 'Cancelado' } },
                    { reenviadoVigencia: true },
                    { agendado: { $ne: 'agendado' } },
                ]
            })

            const propostas = result.filter(proposta => {
                return moment(proposta.vigencia) <= moment()
            })

            return res.json(propostas)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },


    webHookMessage: async (req, res) => {
        try {

            const twiml = new MessagingResponse();

            // Lógica para processar a mensagem recebida
            const messageBody = req.body.Body;
            const fromNumber = req.body.From;

            console.log(req);

            // Lógica de resposta
            twiml.message(`Você enviou a seguinte mensagem: ${messageBody}`);

            await Chat.create({
                mensagem: messageBody
            })

            // Gere a resposta do TwiML
            res.type('text/xml');
            res.send(twiml.toString());

            return res.json({ msg: 'ok' })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    webHookCall: async (req, res) => {
        const twiml = new VoiceResponse();


        // twiml.say('Hello world!');

        // Use <Record> to record the caller's message
        twiml.record();

        // End the call with <Hangup>
        twiml.hangup();

        // Render the response as XML in reply to the webhook request
        res.type('text/xml');
        res.send(twiml.toString());
    },

    colocandoWppSender: async (req, res) => {
        try {

            const propostas = await PropostaEntrevista.find()

            for (const proposta of propostas) {

                let wppSender = TwilioNumber

                if (proposta.tipoContrato) {
                    if (proposta.tipoContrato.toLowerCase().indexOf('pme') !== -1) {
                        wppSender = TwilioNumberPme
                    }
                }

                await PropostaEntrevista.updateOne({
                    _id: proposta._id
                }, {
                    wppSender
                })

            }

            return res.json(propostas.length)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    ajustarEnfermeiro: async (req, res) => {
        try {

            const { propostas } = req.body

            // for (const item of result) {
            //     const proposta = propostas.find(proposta => proposta.proposta === item.proposta && proposta.nome === item.nome)
            //     await PropostaEntrevista.updateOne({
            //         proposta: proposta?.proposta,
            //         nome: proposta?.nome
            //     }, {
            //         enfermeiro: proposta?.responsavel
            //     })
            //     console.log(proposta?.responsavel, proposta?.proposta, proposta?.nome);
            // }

            for (const item of propostas) {
                console.log(item.dataEntrevista);
                await PropostaEntrevista.updateOne({
                    proposta: item.proposta,
                    nome: item.nome
                }, {
                    enfermeiro: item.responsavel
                })
            }

            res.json({
                msg: 'ok'
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    rendimentoMensal: async (req, res) => {
        try {

            const { analista, mes } = req.params

            const dataAjustadaContato = moment(mes).format('MM/YYYY')

            let objPrazo = {}
            let arrPrazo = [['Data', 'd0', 'd1', 'd2', 'd3', 'd4+', 'meta']]

            const find = await PropostaEntrevista.find({
                dataConclusao: { $regex: mes },
                enfermeiro: analista
            })

            for (const item of find) {

                let diasUteis = calcularDiasUteis(moment(item.dataRecebimento), moment(item.dataConclusao), feriados)

                const key = moment(item.dataConclusao).format('DD/MM/YYYY')

                if (diasUteis === 0) {
                    if (objPrazo[key]) {
                        objPrazo[key].d0 += 1
                    } else {
                        objPrazo[key] = {
                            d0: 1,
                            d1: 0,
                            d2: 0,
                            d3: 0,
                            d4: 0
                        }
                    }
                }

                if (diasUteis === 1) {
                    if (objPrazo[key]) {
                        objPrazo[key].d1 += 1
                    } else {
                        objPrazo[key] = {
                            d0: 0,
                            d1: 1,
                            d2: 0,
                            d3: 0,
                            d4: 0
                        }
                    }
                }

                if (diasUteis === 2) {
                    if (objPrazo[key]) {
                        objPrazo[key].d2 += 1
                    } else {
                        objPrazo[key] = {
                            d0: 0,
                            d1: 0,
                            d2: 1,
                            d3: 0,
                            d4: 0
                        }
                    }
                }

                if (diasUteis === 3) {
                    if (objPrazo[key]) {
                        objPrazo[key].d3 += 1
                    } else {
                        objPrazo[key] = {
                            d0: 0,
                            d1: 0,
                            d2: 0,
                            d3: 1,
                            d4: 0
                        }
                    }
                }

                if (diasUteis >= 4) {
                    if (objPrazo[key]) {
                        objPrazo[key].d4 += 1
                    } else {
                        objPrazo[key] = {
                            d0: 0,
                            d1: 0,
                            d2: 0,
                            d3: 0,
                            d4: 1
                        }
                    }
                }
            }

            for (const item of Object.entries(objPrazo)) {

                let total = item[1].d0 + item[1].d1 + item[1].d2 + item[1].d3 + item[1].d4

                arrPrazo.push([
                    item[0],
                    item[1].d0,
                    item[1].d1,
                    item[1].d2,
                    item[1].d3,
                    item[1].d4,
                    22
                ])

            }

            arrPrazo.sort((a, b) => {
                const dateA = new Date(a[0].split('/').reverse().join('-'));
                const dateB = new Date(b[0].split('/').reverse().join('-'));
                return dateA - dateB;
            });

            const primeiroContato = await PropostaEntrevista.find({
                contato1: { $regex: dataAjustadaContato },
                responsavelContato1: analista
            }).count()

            const segundoContato = await PropostaEntrevista.find({
                contato2: { $regex: dataAjustadaContato },
                responsavelContato2: analista
            }).count()

            const terceiroContato = await PropostaEntrevista.find({
                contato3: { $regex: dataAjustadaContato },
                responsavelContato3: analista
            }).count()

            let agendadas = 0
            let naoAgendadas = 0

            for (const item of find) {
                if (item.agendado === 'agendado') {
                    agendadas++;
                } else {
                    naoAgendadas++;
                }
            }

            return res.json({
                agendadas,
                naoAgendadas,
                primeiroContato,
                segundoContato,
                terceiroContato,
                arrPrazo
            })


        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    producaoMensal: async (req, res) => {
        try {

            const { mes } = req.params

            const find = await PropostaEntrevista.find({
                dataConclusao: { $regex: mes },
                $or: [
                    { status: 'Concluído' },
                    { status: 'Cancelado' }
                ]
            })

            return res.json(find)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    ajustarResponsavel: async (req, res) => {
        try {

            const { dados } = req.body

            console.log(dados);

            return res.json({
                msg: 'ok'
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    producaoAgendamento: async (req, res) => {
        try {

            const { analista, mes } = req.params

            const result = await PropostaEntrevista.find({
                quemAgendou: analista,
                dataEntrevista: { $regex: mes }
            })

            return res.json(result.length)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    reindexando: async (req, res) => {
        try {
            async function reindexDocuments() {
                const documentos = await PropostaEntrevista.find({}); // Recupere todos os documentos existentes
                for (const documento of documentos) {
                    await documento.save(); // Salve cada documento para atualizar os índices
                }
            }

            reindexDocuments()
                .then(() => {
                    console.log('Índices reindexados com sucesso para documentos existentes.');
                    process.exit(0);
                })
                .catch((error) => {
                    console.error('Erro ao reindexar índices:', error);
                    process.exit(1);
                });
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    verificadorDadosProposta: async (req, res) => {
        try {
            const { proposta, nome } = req.params
            const result = await PropostaEntrevista.findOne({
                proposta,
                nome
            })
            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    hookStatusMessage: async (req, res) => {
        try {

            console.log(req);

            return res.json(req.body)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    }
}

function ExcelDateToJSDate(serial) {
    var utc_days = Math.floor(serial - 25569);
    var utc_value = utc_days * 86400;
    var date_info = new Date(utc_value * 1000);

    var fractional_day = serial - Math.floor(serial) + 0.0000001;

    var total_seconds = Math.floor(86400 * fractional_day);

    var seconds = total_seconds % 60;

    total_seconds -= seconds;

    var hours = Math.floor(total_seconds / (60 * 60));
    var minutes = Math.floor(total_seconds / 60) % 60;

    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
}

function calcularIdade(data) {
    var now = new Date();
    var today = new Date(now.getYear(), now.getMonth(), now.getDate());

    var yearNow = now.getYear();
    var monthNow = now.getMonth();
    var dateNow = now.getDate();
    var dob = new Date(data.substring(6, 10),
        data.substring(3, 5) - 1,
        data.substring(0, 2)
    );

    var yearDob = dob.getYear();
    var monthDob = dob.getMonth();
    var dateDob = dob.getDate();
    var age = {};
    yearAge = yearNow - yearDob;

    if (monthNow >= monthDob)
        var monthAge = monthNow - monthDob;
    else {
        yearAge--;
        var monthAge = 12 + monthNow - monthDob;
    }

    if (dateNow >= dateDob)
        var dateAge = dateNow - dateDob;
    else {
        monthAge--;
        var dateAge = 31 + dateNow - dateDob;

        if (monthAge < 0) {
            monthAge = 11;
            yearAge--;
        }
    }

    age = {
        years: yearAge,
        months: monthAge,
        days: dateAge
    };
    return age.years;
}

function modeloMensagem1(nome, data1, data2) {

    let mensagem = `Prezado Sr.(a) ${nome},
    Somos da Área de Implantação da Amil e para concluirmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) precisamos confirmar alguns dados médicos.
    Por gentileza, escolha o *NÚMERO* referente a janela de horários para entrarmos em contato com o Sr.(a)
    *${data1}*
    1. Das 13:00 às 15:00
    2. Das 15:00 às 17:00
    3. Das 17:00 às 19:00
    *${data2}*
    4. Das 09:00 às 11:00
    5. Das 11:00 às 13:00
    6. Das 13:00 às 15:00
    7. Das 15:00 às 17:00
    8. Das 17:00 às 19:00
    Qual o melhor horário?
    Informamos que vamos ligar dos números 11 42404975 ou 42403554, pedimos tirar do spam para evitar bloqueio da ligação. Desde já agradecemos.
    Atenção: o preenchimento dos horários é feito em tempo real. Caso o horário informado não esteja mais disponível, apresentarei uma nova opção.`

    return { data1, data2, mensagem }
}

function modeloMensagem2(nome, data1, data2) {

    let mensagem = `Prezado Sr.(a) ${nome},
    Somos da Área de Implantação da Amil e para concluirmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) precisamos confirmar alguns dados médicos.
    Por gentileza, escolha o *NÚMERO* referente a janela de horários para entrarmos em contato com o Sr.(a)
    *${data1}*
    1. Das 09:00 às 11:00
    2. Das 11:00 às 13:00
    3. Das 13:00 às 15:00
    4. Das 15:00 às 17:00
    5. Das 17:00 às 19:00
    *${data2}*
    6. Das 09:00 às 11:00
    7. Das 11:00 às 13:00
    8. Das 13:00 às 15:00
    9. Das 15:00 às 17:00
    10. Das 17:00 às 19:00
    Qual o melhor horário?
    Informamos que vamos ligar dos números 11 42404975 ou 42403554, pedimos tirar do spam para evitar bloqueio da ligação. Desde já agradecemos.
    Atenção: o preenchimento dos horários é feito em tempo real. Caso o horário informado não esteja mais disponível, apresentarei uma nova opção.`

    return { data1, data2, mensagem }
}

const feriados = [
    moment('2022-01-01'),
    moment('2022-04-21'),
    moment('2022-05-01'),
    moment('2022-09-07'),
    moment('2022-10-12'),
    moment('2022-11-02'),
    moment('2022-11-15'),
    moment('2022-12-25'),
    moment('2023-01-01'),
    moment('2023-02-20'),
    moment('2023-02-21'),
    moment('2023-02-22'),
    moment('2023-04-07'),
    moment('2023-04-21'),
    moment('2023-05-01'),
    moment('2023-06-08'),
    moment('2023-09-07'),
    moment('2023-10-12'),
    moment('2023-11-02'),
    moment('2023-11-15'),
    moment('2023-12-25')
];

function calcularDiasUteis(dataInicio, dataFim, feriados) {
    let diasUteis = 0;
    let dataAtual = moment(dataInicio);

    while (dataAtual.isSameOrBefore(dataFim, 'day')) {
        if (dataAtual.isBusinessDay() && !feriados.some(feriado => feriado.isSame(dataAtual, 'day'))) {
            diasUteis++;
        }
        dataAtual.add(1, 'day');
    }

    return diasUteis - 1;
}