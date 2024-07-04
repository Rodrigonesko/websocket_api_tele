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
const { modeloMensagem1, modeloMensagem2, countWeekdaysInMonth } = require('../utils/functions')
const { calcularIdade } = require('../utils/functions')
const { ExcelDateToJSDate } = require('../utils/functions')
const { calcularDiasUteis } = require('../utils/functions')

const { io } = require('../../index');
const Log = require('../models/Log');

module.exports = {
    upload: async (req, res) => {
        try {
            const { result } = req.body
            let quantidade = 0

            // Verifique se 'result' é um array antes de chamar 'reduce'
            if (!Array.isArray(result)) {
                throw new Error("'result' deve ser um array");
            }

            result.sort((a, b) => a.NUM_PROPOSTA - b.NUM_PROPOSTA)

            const arrCpfTitulares = result.reduce((acc, item) => {
                let numPropostas = []

                result.forEach(e => {
                    const proposta = e.NUM_PROPOSTA || e.PROPOSTA
                    const tipoAssociado = e.TIPO_ASSOCIADO || e.T
                    const itemExistente = numPropostas.find((elem) => elem.proposta === proposta)
                    let cpf = ''
                    if (typeof (e.NUM_CPF) !== 'number' && e.NUM_CPF !== undefined) {
                        cpf = e.NUM_CPF.replace(/\D/g, '')
                    } else {
                        cpf = e.NUM_CPF
                    }
                    if (itemExistente) {
                        if (tipoAssociado === 'Titular') {
                            itemExistente.numTitulares += 1
                            itemExistente.numAssociados += 1
                            itemExistente.cpfTitular = cpf
                        } else {
                            itemExistente.numAssociados += 1
                        }
                    } else if (tipoAssociado === "Titular") {
                        numPropostas.push({ proposta: proposta, numTitulares: 1, numAssociados: 1, cpfTitular: cpf })
                    } else {
                        numPropostas.push({ proposta: proposta, numAssociados: 1, numTitulares: 0 })
                    }
                })

                const itemExistenteAssociados = numPropostas.find((elem) => elem.proposta === item.NUM_PROPOSTA)
                if (itemExistenteAssociados.numTitulares !== 1 && itemExistenteAssociados.numTitulares !== itemExistenteAssociados.numAssociados) {
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

            let counter = 0;
            const wppSenders = [TwilioNumber, TwilioNumberPme, TwilioNumberSP];


            for (const item of arrCpfTitulares) {

                try {
                    let wppSender = wppSenders[counter % wppSenders.length];
                    if (item.TIPO_CONTRATO === 'ADESÃO') wppSender = 'whatsapp:+551150394280'
                    counter++;

                    let proposta = item.NUM_PROPOSTA || item.PROPOSTA

                    //verifica se a proposta é um número

                    if (typeof (proposta) !== 'number') {
                        proposta = proposta.replace(/\D/g, '')
                    }

                    // const proposta = item?.NUM_PROPOSTA?.replace(/\D/g, '');

                    let vigencia = ExcelDateToJSDate(item.DT_VENDA)
                    vigencia.setDate(vigencia.getDate() + 1)
                    vigencia = moment(vigencia).format('YYYY-MM-DD')
                    const vigenciaAmil = vigencia

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

                    let cpf = ''

                    //Verificar se o item.NUM_CPF não é um número

                    if (typeof (item.NUM_CPF) !== 'number' && item.NUM_CPF !== undefined) {
                        cpf = item.NUM_CPF.replace(/\D/g, '')
                    } else {
                        cpf = item.NUM_CPF
                    }
                    const nome = item.NOME_ASSOCIADO?.trim()
                    const sexo = item.SEXO
                    const tipoAssociado = item.TIPO_ASSOCIADO || item.T
                    let tipoContrato = item.TIPO_CONTRATO

                    function removeAcentos(text) {
                        return text.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
                    }

                    if (removeAcentos(tipoContrato).toLowerCase() === 'pessoa fisica') {
                        tipoContrato = 'PF - PESSOA FÍSICA'
                    }

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

                    // let wppSender = TwilioNumber

                    // if (tipoContrato.toLowerCase().indexOf('pme') !== -1) {
                    //     wppSender = TwilioNumberPme
                    // }

                    const observacao = item['OBSERVAÇÕES']
                    const ddd = item.NUM_DDD_CEL || item.NUM_DDD_TEL || item.DDD
                    let numero = item.NUM_CEL?.toString().replace(/\s/g, '') || item.NUM_TEL?.toString().replace(/\s/g, '') || item.TELEFONE?.toString().replace(/\s/g, '')

                    let telefone = ''

                    if (ddd && numero) {
                        telefone = `(${ddd}) ${numero}`
                    }

                    // if (ddd == '11') {
                    //     wppSender = TwilioNumberSP
                    // }

                    if (numero?.length !== 9 && numero !== undefined) {
                        numero = `9${numero}`
                    }

                    const celularCompleto = `55${ddd}${numero}`

                    let whatsapp = `whatsapp:+55`

                    if (ddd && numero) {
                        whatsapp = `whatsapp:+55${ddd}${numero}`
                    }
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
                        wppSender,
                        newStatus: 'Agendar',
                        vigenciaAmil
                    }

                    const existeProposta = await PropostaEntrevista.findOne({
                        proposta,
                        nome
                    })

                    if (!existeProposta) {
                        const newPropostaEntrevista = await PropostaEntrevista.create(resultado)
                        quantidade++
                    }
                } catch (error) {
                    console.log(error);
                    return res.status(400).json({
                        error: `Erro ao processar a proposta ${item.NUM_PROPOSTA}, Todas as propostas anteriores foram inseridas`
                    })
                    //throw new Error(`Erro ao processar a proposta ${item.NUM_PROPOSTA}`)
                }
            }

            await Log.create({
                usuario: req.user,
                acao: `Upload de propostas`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
            })

            return res.status(200).json({ message: `Foram inseridas ${quantidade} novas propostas!` })
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                error: "Internal server error.",
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

            const { id, dataEHora, responsavel, quemAgendou, canal } = req.body

            const find = await PropostaEntrevista.findOne({
                _id: id
            })

            let statusAgendado = ''

            if (find.retrocedido === 'Sim') {
                statusAgendado = 'Cancelado humanizado'
            }
            if (find.janelaHorario) {
                statusAgendado = 'Janela'
            }

            if (find.newStatus === 'Erro Whatsapp' || find.newStatus === 'Sem Whatsapp') {
                statusAgendado = 'Sem Whatsapp'
            }

            if (find.atendimentoHumanizado) {
                statusAgendado = 'Humanizado'
            }

            const updateTele = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                dataEntrevista: dataEHora,
                agendado: 'agendado',
                enfermeiro: responsavel,
                quemAgendou: quemAgendou,
                newStatus: 'Agendado',
                canal,
                statusAgendado,
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
                lembrete: false,
                newStatus: 'Agendar'
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
                dataConclusao: moment().format('YYYY-MM-DD'),
                newStatus: 'Cancelado'
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

            await Log.create({
                usuario: req.user,
                acao: `Deletou a proposta ${remove.proposta}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
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

            const result = await PropostaEntrevista.findOneAndUpdate({
                _id: id
            }, {
                telefone: telefone
            })

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

            if (find.whatsappsAnteriores.includes(whatsapp)) {
                await PropostaEntrevista.updateOne({
                    _id
                }, {
                    whatsapp
                })

                return res.json({
                    msg: 'ok'
                })
            }

            await PropostaEntrevista.updateOne({
                _id
            }, {
                whatsapp,
                $push: {
                    whatsappsAnteriores: find.whatsapp
                }
            })

            await Log.create({
                usuario: req.user,
                acao: `Alterou o whatsapp da proposta ${find.proposta} - ${find.nome}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
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

            await Log.create({
                usuario: req.user,
                acao: `Alterou a vigência da proposta ${proposta.proposta} - ${proposta.nome}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
            })

            return res.json(proposta)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    alterarVigenciaPorCpfTitular: async (req, res) => {
        try {

            const { cpfTitular, vigencia } = req.body

            const proposta = await PropostaEntrevista.updateMany({
                cpfTitular
            }, {
                vigencia
            })

            await Log.create({
                usuario: req.user,
                acao: `Alterou a vigência da proposta ${proposta.proposta} - ${proposta.cpfTitular}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
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

            await Log.create({
                usuario: req.user,
                acao: `Alterou o formulário da proposta ${proposta.proposta} - ${proposta.nome}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
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

            await Log.create({
                usuario: req.user,
                acao: `Alterou o sexo da proposta ${proposta.proposta} - ${proposta.nome}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
            })

            return res.status(200).json(proposta)

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
                retrocedido: 'Ret',
                newStatus: 'Agendar'
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

            const { tentativa, id, tipo } = req.body

            switch (tentativa) {
                case 'tentativa 1':
                    await PropostaEntrevista.findByIdAndUpdate({
                        _id: id
                    }, {
                        responsavelContato1: req.user,
                        contato1: moment().format('DD/MM/YYYY HH:mm:ss'),
                        tipoContato1: tipo
                    })
                    break;
                case 'tentativa 2':
                    await PropostaEntrevista.findByIdAndUpdate({
                        _id: id
                    }, {
                        responsavelContato2: req.user,
                        contato2: moment().format('DD/MM/YYYY HH:mm:ss'),
                        tipoContato2: tipo
                    })
                    break;
                case 'tentativa 3':
                    await PropostaEntrevista.findByIdAndUpdate({
                        _id: id
                    }, {
                        responsavelContato3: req.user,
                        contato3: moment().format('DD/MM/YYYY HH:mm:ss'),
                        tipoContato3: tipo
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
                enfermeiro: req.user,
                newStatus: 'Concluído'
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
                situacao: 'A enviar',
                $and: [
                    {
                        status: { $ne: 'Concluído' }
                    },
                    {
                        status: { $ne: 'Cancelado' }
                    }
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

    propostasAAjustar: async (req, res) => {
        try {

            const propostas = await PropostaEntrevista.find({
                situacao: 'Corrigir',
                $and: [
                    { status: { $ne: 'Concluído' } },
                    { status: { $ne: 'Cancelado' } }
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

    ajustarCpf: async (req, res) => {
        try {
            const { propostas } = req.body

            for (const item of propostas) {
                let cpfClean = item.cpfTitular.replace(/[^0-9]/g, '');
                cpfClean = Number(cpfClean)
                await PropostaEntrevista.findByIdAndUpdate({
                    _id: item.id
                }, {
                    cpfTitular: cpfClean,
                    situacao: 'A enviar',
                    quemAjustou: req.user,
                })
            }

            await Log.create({
                usuario: req.user,
                acao: `Ajustou o CPF de ${propostas.length} propostas`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
            })

            return res.json({ msg: 'ok' })

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

            await Log.create({
                usuario: req.user,
                acao: `Voltou o ajuste da proposta ${result.proposta}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
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

            const wppSender = process.env.TWILIO_NUMBER

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

            if (proposta.tipoContrato === 'ADESÃO') {
                return res.json({ msg: 'Adesão' })
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


            for (let index = 0; index < 5; index++) {
                verificarStatusMensagem = await client.messages(result.sid).fetch()
            }

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
                wppSender
            })

            const mensagemBanco = await Chat.create({
                de: wppSender,
                para: whatsapp,
                mensagem,
                horario: moment().format('YYYY-MM-DD HH:mm'),
                status: verificarStatusMensagem.status,
                sid: verificarStatusMensagem.sid
            })

            await Log.create({
                usuario: req.user,
                acao: `Enviou mensagem para ${proposta.nome} - ${proposta.proposta}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
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

            const { from, mensagem, fixed, To } = req.body

            console.log(To);

            await Chat.create({
                de: fixed,
                para: To,
                mensagem,
                horario: moment().format('YYYY-MM-DD HH:mm')
            })

            //Caso seja sabado, domingo, se passou das 17:30 ou é antes das 08:30 da manha retorna mensagem de fora do horario de atendimento

            const diaDaSemana = moment().format('dddd')
            const hora = moment().format('HH:mm')

            if (diaDaSemana === 'Saturday' || diaDaSemana === 'Sunday' || hora > '17:30' || hora < '08:30') {
                const msg = "Olá, nosso horário de atendimento é de segunda a sexta das 08:30 às 17:30, responderemos sua mensagem assim que possível. A amil agradece seu contato."
                const messageTwilio = await client.messages.create({
                    from: To,
                    body: msg,
                    to: from
                })

                await Chat.create({
                    de: To,
                    para: fixed,
                    mensagem: msg,
                    horario: moment().format('YYYY-MM-DD HH:mm'),
                    status: messageTwilio.status,
                    sid: messageTwilio.sid
                })

                return res.json(msg)
            }

            await PropostaEntrevista.updateMany({
                whatsapp: fixed,
                status: { $ne: 'Cancelado', $ne: 'Concluído' },
            }, {
                wppSender: To
            })

            const find = await PropostaEntrevista.findOne({
                whatsapp: fixed,
                status: { $ne: 'Cancelado', $ne: 'Concluído' }
            });


            if (!find) {
                //mandar mensagem para atendimento humanizado
                const msg = "Seu número não consta em nossa base de contatos"
                const messageTwilio = await client.messages.create({
                    from: To,
                    body: msg,
                    to: from
                })

                await Chat.create({
                    de: To,
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

            if (find.status === 'Cancelado') {

                const msg = "Um atendente irá entrar em contato para realizar o agendamento."
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

                await PropostaEntrevista.findByIdAndUpdate({
                    _id: find._id
                }, {
                    atendimentoHumanizado: true,
                    perguntaAtendimentoHumanizado: true
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
                            janelaHorario: `Das 12:00 às 14:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 2:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 14:00 às 16:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 3:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 16:00 às 18:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 4:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 08:00 às 10:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 5:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 10:00 às 12:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 6:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 12:00 às 14:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 7:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 14:00 às 16:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 8:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 16:00 às 18:00 ${find.opcaoDia2}`,
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
                            janelaHorario: `Das 08:00 às 10:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 2:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 10:00 às 12:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 3:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 12:00 às 14:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 4:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 14:00 às 16:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 5:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 16:00 às 18:00${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 6:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 08:00 às 10:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 7:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 10:00 às 12:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 8:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 12:00 às 14:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 9:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 14:00 às 16:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false,
                            horarioRespondido: moment().format('YYYY-MM-DD HH:mm')
                        })
                        break;
                    case 10:

                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 16:00 às 18:00 ${find.opcaoDia2}`,
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

    testeMensagem: async (req, res) => {
        try {

            let mensagem = modeloMensagem1('RODRIGO ONESKO DIAS', '26/04/2023', '27/04/2023').mensagem

            const result = await client.messages.create({
                // from: TwilioNumberPme,
                // body: 'Estamos tentando contato com o Sr(a) porém sem sucesso. A Sr(a) pode por favor ligar no número 11 4240-0422 e pedir para falar com a equipe médica.',
                // to: 'whatsapp:+5541997971794'
                to: 'whatsapp:+5541997971794',
                from: TwilioNumberPme,
                contentSid: 'HX456edc7c3b415bb4af1d204900bbddca',
                messagingServiceSid: 'MG2343a045ad4b5d47d49fa6ce47f08367',
                //body: 'Estamos tentando contato com o Sr(a) porém sem sucesso. A Sr(a) pode por favor ligar no número 11 4240-0422 e pedir para falar com a equipe médica.',
            })

            console.log(result);

            const response = await client.messages(result.sid).fetch()

            console.log(response);

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

            await Log.create({
                usuario: req.user,
                acao: `Mandou para atendimento humanizado a proposta ${result.proposta} - ${result.nome}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
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


    mandarMensagem: async (req, res) => {
        try {

            const { whatsapp, mensagem, id } = req.body

            let find = await PropostaEntrevista.findOne({
                whatsapp
            })

            if (id) {
                find = await PropostaEntrevista.findOne({
                    _id: id
                })
            }

            const wppSender = find.wppSender

            const result = await client.messages.create({
                from: wppSender,
                body: mensagem,
                to: whatsapp
            })

            await PropostaEntrevista.updateOne({
                _id: find._id
            }, {
                atendimentoHumanizado: true,
                perguntaAtendimentoHumanizado: true
            })

            let verificarStatusMensagem = await client.messages(result.sid).fetch()
            verificarStatusMensagem = await client.messages(result.sid).fetch()
            verificarStatusMensagem = await client.messages(result.sid).fetch()
            verificarStatusMensagem = await client.messages(result.sid).fetch()

            if (verificarStatusMensagem.status === 'failed' || verificarStatusMensagem.status === 'undelivered') {
                return res.status(403).json({
                    msg: verificarStatusMensagem.errorCode
                })
            }

            await Chat.create({
                de: wppSender,
                para: whatsapp,
                mensagem,
                horario: moment().format('YYYY-MM-DD HH:mm'),
                status: verificarStatusMensagem.status,
                sid: verificarStatusMensagem.sid,
                errorCode: verificarStatusMensagem.errorCode,
                quemEnviou: req.user
            })

            return res.json({ msg: 'ok' })

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

            console.log(id);

            const result = await PropostaEntrevista.findByIdAndUpdate({
                _id: id
            }, {
                situacao: 'agendado',
                newStatus: 'Agendado'
            })

            const wppSender = result.wppSender

            if (result.tipoAssociado === 'Dependente') {
                return res.json(result)
            }

            const dependentes = await PropostaEntrevista.find({
                cpfTitular: result.cpfTitular
            })

            const umaHoraAntes = moment(result.dataEntrevista).subtract(1, 'hours').format('HH:mm')
            let umaHoraDepois = ''
            if (moment(result.dataEntrevista).format('HH:mm') === '17:20' || moment(result.dataEntrevista).format('HH:mm') === '17:40') {
                umaHoraDepois = '18:00'
            } else {
                umaHoraDepois = moment(result.dataEntrevista).add(1, 'hours').format('HH:mm')
            }
            if (moment(result.dataEntrevista).format('HH:mm') === '08:00' || moment(result.dataEntrevista).format('HH:mm') === '08:20' || moment(result.dataEntrevista).format('HH:mm') === '08:40') {
                umaHoraAntes = '08:00'
            }

            let msg = `Agendado para o dia ${moment(result.dataEntrevista).format("DD/MM/YYYY")} das ${umaHoraAntes} até as ${umaHoraDepois}.
Lembrando que em caso de menor de idade a entrevista será realizada com o responsável legal, não necessitando da presença do menor no momento da ligação.`

            console.log(msg);


            if (dependentes.length > 1) {
                msg = `Agendado para o dia ${moment(result.dataEntrevista).format("DD/MM/YYYY")} das ${umaHoraAntes} até as ${umaHoraDepois}. Lembrando que a entrevista é para o Senhor(a) e os dependentes, `
                let count = 0
                for (const e of dependentes) {
                    count++
                    if (e.nome === result.nome) {
                        continue
                    }
                    if (count === dependentes.length - 1) {
                        msg += `${e.nome}.`
                        continue
                    }
                    msg += `${e.nome}, `

                }
                msg += ` Pedimos confirmar se estarão presentes no mesmo horário, caso negativo pedimos informar o contato deles em resposta a esse whatsapp para podermos agendar novo horário com os mesmos. 
Lembrando que em caso de menor de idade a entrevista será realizada com o responsável legal, não necessitando da presença do menor no momento da ligação.`

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
                    sid: messageTwilio.sid,
                    errorCode: messageTwilio.errorCode
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
                sid: messageTwilio.sid,
                errorCode: messageTwilio.errorCode
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

            await Log.create({
                usuario: req.user,
                acao: `Assumiu o atendimento da proposta ${result.proposta} - ${result.nome}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
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

            if (!dados) {
                return res.json({
                    msg: 'Não encontrado'
                })
            }

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
                sid: messageTwilio.sid,
                errorCode: messageTwilio.errorCode
            })

            await Log.create({
                usuario: req.user,
                acao: `Reenviou mensagem para o whatsapp ${proposta.whatsapp}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
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


            let mensagem = `Visto que o preenchimento dos horários é feito em tempo real, esse horário já foi preenchido. Vou te passar os horários disponíveis atualizados:\nHorários disponíveis para o dia ${moment(data).format('DD/MM/YYYY')} - `

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
                    sid: messageTwilio.sid,
                    errorCode: messageTwilio.errorCode
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

            await Log.create({
                usuario: req.user,
                acao: `Reenviou mensagem para os whatsapp ${whatsapps}`,
                data: moment().format('DD/MM/YYYY HH:mm:ss')
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
                    { tipoContrato: { $regex: /pf/, $options: 'i' } }
                ]
            }).lean()

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

    rendimentoMensal: async (req, res) => {
        try {

            const { analista, mes } = req.params

            const dataAjustadaContato = moment(mes).format('MM/YYYY')

            let objPrazo = {}
            let arrPrazo = [['Data', 'd0', 'd1', 'd2', 'd3', 'd4+', 'meta']]

            const find = await PropostaEntrevista.find({
                dataConclusao: { $regex: mes },
                enfermeiro: analista
            }).lean()

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

    producaoAgendamento: async (req, res) => {
        try {

            const { analista, mes } = req.params

            const result = await PropostaEntrevista.find({
                quemAgendou: analista,
                dataEntrevista: { $regex: mes }
            }).countDocuments()

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    buscarPorPropostaENome: async (req, res) => {
        try {

            const { nome, proposta } = req.params

            const result = await PropostaEntrevista.findOne({
                nome,
                proposta
            })

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    buscarPropostasPeloCpfTitular: async (req, res) => {
        try {

            const { cpfTitular } = req.params
            const result = await PropostaEntrevista.find({
                cpfTitular
            })
            return res.json(result)

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

            const { SmsSid, SmsStatus, To, From, ErrorCode } = req.body

            const update = await Chat.updateOne({
                sid: SmsSid
            }, {
                status: SmsStatus,
                errorCode: ErrorCode || undefined
            })

            if (update.nModified === 0) {
                return res.json({ msg: 'ok' })
            }

            io.emit('statusMessage', {
                SmsSid,
                SmsStatus,
                To,
                From
            })

            return res.json(req.body)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: 'Internal Server Error'
            })
        }
    },

    filterPropostas: async (req, res) => {
        try {

            /*
                  const [status, setStatus] = useState({
        agendar: true,
        humanizado: true,
        janelas: true,
        ajustar: true,
        semWhats: true,
        agendado: true,
    });
 
    const [tipoContrato, setTipoContrato] = useState({
        pme: true,
        pf: true,
        adesao: true,
    });
 
    const [vigencia, setVigencia] = useState({
        noPrazo: true,
        foraDoPrazo: true,
    });
 
    const [altoRisco, setAltoRisco] = useState({
        baixo: true,
        medio: true,
        alto: true,
    });
 
        const [idade, setIdade] = useState({
        maior60: false,
        menor60: false,
    });
            */

            const { status, tipoContrato, vigencia, altoRisco, idade, page = 1, limit = 100 } = req.body

            let skip = (page - 1) * limit

            // Se todas as propriedades do objeto forem true
            if (Object.values(status).every(e => e === true) && Object.values(tipoContrato).every(e => e === true) && Object.values(vigencia).every(e => e === true) && Object.values(altoRisco).every(e => e === true)) {

                console.log('entrou aqui');

                const result = await PropostaEntrevista.find({
                    $and: [
                        { status: { $ne: "Concluído" } },
                        { status: { $ne: 'Cancelado' } },
                    ]
                }).skip(skip).limit(limit)
                const total = await PropostaEntrevista.find({
                    $and: [
                        { status: { $ne: "Concluído" } },
                        { status: { $ne: 'Cancelado' } },

                    ]
                }).countDocuments()
                return res.json({ result, total })
            }

            let filter = {
            }

            let filterConditions = []

            if (status.agendar) {
                // filterConditions.push({ newStatus: 'Agendar' })
                filterConditions.push({ agendado: { $ne: 'agendado' } })
            }

            if (status.canceladoHumanizado) {
                filterConditions.push({ status: 'Cancelado' })
                filterConditions.push({ atendimentoHumanizado: true })
            }

            if (status.humanizado) {
                filterConditions.push({ atendimentoHumanizado: true })
            }

            if (status.naoLidas) {
                filterConditions.push({ visualizado: true })
            }

            if (status.janelas) {
                filterConditions.push({ situacao: 'Janela escolhida' })
                filterConditions.push({ atendimentoHumanizado: false })
            }

            if (status.ajustar) {
                filterConditions.push({ situacao: 'Corrigir' })
            }

            if (status.semWhats) {
                filterConditions.push({ newStatus: 'Sem whatsapp' })
            }

            if (status.erroWhatsapp) {
                filterConditions.push({ newStatus: 'Problemas ao Enviar' })
            }

            if (status.agendado) {
                filterConditions.push({ newStatus: 'Agendado' })
            }

            if (tipoContrato.pme) {
                filterConditions.push({ tipoContrato: { $regex: 'pme', $options: 'i' } })
            }

            if (tipoContrato.pf) {
                filterConditions.push({ tipoContrato: { $regex: 'pf', $options: 'i' } })
            }

            if (tipoContrato.adesao) {
                filterConditions.push({ tipoContrato: { $regex: 'adesão', $options: 'i' } })
            }

            if (vigencia.noPrazo) {
                filterConditions.push({ vigencia: { $gte: moment().format('YYYY-MM-DD') } })
            }

            if (vigencia.foraDoPrazo) {
                filterConditions.push({ vigencia: { $lt: moment().format('YYYY-MM-DD') } })
            }

            if (altoRisco.baixo) {
                filterConditions.push({ riscoBeneficiario: undefined })
            }

            if (altoRisco.medio) {
                filterConditions.push({ riscoBeneficiario: 'Médio' })
            }

            if (altoRisco.alto) {
                filterConditions.push({ riscoBeneficiario: 'Alto' })
            }

            if (idade.maior60) {
                filterConditions.push({ idade: { $gte: 60 } })
            }

            if (idade.menor60) {
                filterConditions.push({ idade: { $lt: 60 } })
            }

            if (!status.canceladoHumanizado) {
                filterConditions.push({ status: { $ne: 'Concluído' } })
                filterConditions.push({ status: { $ne: 'Cancelado' } })
            }

            if (filterConditions.length > 0) {
                filter.$and = filterConditions
            }

            console.log(filter);

            const result = await PropostaEntrevista.find(filter).skip(skip).limit(limit).sort('vigencia')
            const total = await PropostaEntrevista.countDocuments(filter)

            console.log(total);

            return res.json({ result, total })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    quantidadeNaoRealizadas: async (req, res) => {
        try {

            const agendar = await PropostaEntrevista.countDocuments({
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } },
                    { agendado: { $ne: 'agendado' } },
                ]
            })

            const humanizado = await PropostaEntrevista.countDocuments({
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } },
                    { atendimentoHumanizado: true },
                ]
            })

            const canceladoHumanizado = await PropostaEntrevista.countDocuments({
                status: 'Cancelado',
                atendimentoHumanizado: true
            })

            const naoLidas = await PropostaEntrevista.countDocuments({
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } },
                    { visualizado: true }
                ]
            })

            const janelas = await PropostaEntrevista.countDocuments({
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } },
                    { situacao: 'Janela escolhida' },
                    { atendimentoHumanizado: false }
                ]
            })

            const ajustar = await PropostaEntrevista.countDocuments({
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } },
                    { situacao: 'Corrigir' },
                ]
            })

            const semWhats = await PropostaEntrevista.countDocuments({
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } },
                    { newStatus: 'Sem whatsapp' }
                ]
            })

            const erroWhatsapp = await PropostaEntrevista.countDocuments({
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } },
                    { newStatus: 'Problemas ao Enviar' }
                ]
            })

            const agendado = await PropostaEntrevista.countDocuments({
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } },
                    { newStatus: 'Agendado' },
                ]
            })

            const pme = await PropostaEntrevista.countDocuments({
                tipoContrato: { $regex: 'pme', $options: 'i' },
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } }
                ]
            })

            const pf = await PropostaEntrevista.countDocuments({
                tipoContrato: { $regex: 'pf', $options: 'i' },
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } }
                ]
            })

            const adesao = await PropostaEntrevista.countDocuments({
                tipoContrato: { $regex: 'adesão', $options: 'i' },
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } }
                ]
            })

            const noPrazo = await PropostaEntrevista.countDocuments({
                vigencia: { $gte: moment().format('YYYY-MM-DD') },
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } }
                ]
            })

            const foraDoPrazo = await PropostaEntrevista.countDocuments({
                vigencia: { $lt: moment().format('YYYY-MM-DD') },
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } }
                ]
            })

            const baixo = await PropostaEntrevista.countDocuments({
                riscoBeneficiario: undefined,
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } }
                ]
            })

            const medio = await PropostaEntrevista.countDocuments({
                riscoBeneficiario: 'Médio',
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } }
                ]
            })

            const alto = await PropostaEntrevista.countDocuments({
                riscoBeneficiario: 'Alto',
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } }
                ]
            })

            const maior60 = await PropostaEntrevista.countDocuments({
                idade: { $gte: 60 },
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } }
                ]
            })

            const menor60 = await PropostaEntrevista.countDocuments({
                idade: { $lt: 60 },
                $and: [
                    { status: { $ne: "Concluído" } },
                    { status: { $ne: 'Cancelado' } }
                ]
            })


            return res.json({
                agendar,
                humanizado,
                canceladoHumanizado,
                janelas,
                ajustar,
                semWhats,
                naoLidas,
                erroWhatsapp,
                agendado,
                pme,
                pf,
                adesao,
                noPrazo,
                foraDoPrazo,
                baixo,
                medio,
                alto,
                maior60,
                menor60
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    filterNaoRealizadas: async (req, res) => {
        try {

            const { pesquisa, page = 1, limit = 100, filters } = req.body

            let skip = (page - 1) * limit

            let filterConditions = [
                { status: { $ne: "Concluído" } },
                { status: { $ne: 'Cancelado' } },
            ]

            if (filters.status.agendar) {
                // filterConditions.push({ newStatus: 'Agendar' })
                filterConditions.push({ agendado: { $ne: 'agendado' } })
            }

            if (filters.status.agendado) {
                filterConditions.push({ newStatus: 'Agendado' })
            }

            const result = await PropostaEntrevista.find({
                $or: [
                    { nome: { $regex: pesquisa, $options: 'i' } },
                    { proposta: { $regex: pesquisa, $options: 'i' } }
                ],
                $and: filterConditions
            }).skip(skip).limit(limit).sort('vigencia')

            const total = await PropostaEntrevista.find({
                $or: [
                    { nome: { $regex: pesquisa, $options: 'i' } },
                    { proposta: { $regex: pesquisa, $options: 'i' } }
                ],
                $and: filterConditions
            }).countDocuments()



            return res.json({ result, total })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    filterAgendadas: async (req, res) => {
        try {
            const { responsavel, page = 1, limit = 100, pesquisa } = req.body

            let skip = (page - 1) * limit

            let query = {
                $and: [
                    { status: { $ne: 'Concluído' } },
                    { status: { $ne: 'Cancelado' } },
                    { agendado: 'agendado' }
                ]
            };

            if (responsavel !== 'Todos') {
                query.enfermeiro = responsavel;
            }

            if (pesquisa) {
                query.$or = [
                    { nome: { $regex: pesquisa, $options: 'i' } },
                    { proposta: { $regex: pesquisa, $options: 'i' } }
                ];
            }

            const result = await PropostaEntrevista.find(query)
                .skip(skip)
                .limit(limit)
                .sort('dataEntrevista')

            const total = await PropostaEntrevista.find(query).countDocuments()

            return res.json({ result, total })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    paginacaoAgenda: async (req, res) => {
        try {

            const { page = 1, limit = 100 } = req.body

            let skip = (page - 1) * limit

            const result = await PropostaEntrevista.find({
                agendado: { $ne: 'agendado' },
                $and: [
                    { status: { $ne: 'Concluído' } },
                    { status: { $ne: 'Cancelado' } }
                ]
            }).skip(skip).limit(limit).sort('vigencia')

            const total = await PropostaEntrevista.find({
                agendado: { $ne: 'agendado' },
                $and: [
                    { status: { $ne: 'Concluído' } },
                    { status: { $ne: 'Cancelado' } }
                ]
            }).countDocuments()

            return res.json({ result, total })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    changeWhatsappSender: async (req, res) => {
        try {

            const { whatsapp, wppSender } = req.body

            const result = await PropostaEntrevista.updateMany({
                whatsapp
            }, {
                wppSender
            })


            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    getPropostasPorMes: async (req, res) => {
        try {

            const { mes } = req.params
            const result = await PropostaEntrevista.find({
                dataConclusao: { $regex: mes }
            }).lean().sort('dataConclusao')

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    quantidadePropostasPorMesFiltradas: async (req, res) => {
        try {

            const query = req.body

            const result = await PropostaEntrevista.find(query).countDocuments()

            return res.json(result)
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    graficoPropostasPorMesFiltradas: async (req, res) => {
        try {

            const body = req.body

            const result = await PropostaEntrevista.find(body.query).lean()

            let data = [
                //{ x: 'Dia/Mes/Ano', y: 54 },
            ]

            for (const item of result) {

                const key = moment(item[body.key]).format('YYYY-MM-DD')

                const index = data.findIndex(e => e.x === key)

                if (index === -1) {
                    data.push({
                        x: key,
                        y: 1
                    })
                } else {
                    data[index].y += 1
                }
            }

            data = data.map(e => {
                return {
                    x: moment(e.x).format('DD/MM'),
                    y: e.y
                }
            }).sort((a, b) => {
                const dateA = new Date(a.x.split('/').reverse().join('-'));
                const dateB = new Date(b.x.split('/').reverse().join('-'));
                return dateA - dateB;
            });

            return res.json(data)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    quantidadeAnalistasPorMes: async (req, res) => {
        try {

            const { mes } = req.params

            const result = await PropostaEntrevista.aggregate([
                {
                    $match: {
                        dataConclusao: { $regex: mes }
                    }
                },
                {
                    $group: {
                        _id: '$enfermeiro',
                        total: { $sum: 1 }
                    }
                }
            ])

            console.log(result);

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    relatorioAgendamentoPorMes: async (req, res) => {
        try {

            const { mes } = req.params

            const result = await PropostaEntrevista.find({
                dataEntrevista: { $regex: mes }
            })

            console.log(result);

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error"
            })
        }
    },

    filtroNaoEnviadas: async (req, res) => {

        const { filter } = req.body

        const result = await PropostaEntrevista.find({
            $and: [
                { status: { $ne: 'Concluído' } },
                { status: { $ne: 'Cancelado' } },
                { situacao: 'A enviar' },
                { agendado: { $ne: 'agendado' } },
            ]
        }).lean()

        console.log(result.length);

        let cpfsTitulares = result.reduce((acc, cur) => {
            acc[cur.cpfTitular] = acc[cur.cpfTitular] || [];
            acc[cur.cpfTitular].push(cur);
            return acc;
        }, {});

        let propostasSemDependentesEntre9a17 = Object.entries(cpfsTitulares).map(propostas => {
            let flag = false;
            for (const proposta of propostas[1]) {
                if (proposta.idade >= 9 && proposta.idade <= 17) {
                    flag = true;
                }
            }
            if (!flag) {
                return propostas[1];
            }
        })

        let filtradas = [];

        if (filter === 'titular unico') {
            filtradas = Object.entries(cpfsTitulares).filter(propostas => propostas[1].length === 1 && propostas[1][0].tipoAssociado === 'Titular').map(propostas => {
                return propostas[1];
            }).flat()
        }
        if (filter === 'titular unico com dependente menor de 8 anos') {
            filtradas = Object.entries(cpfsTitulares).map(propostas => {
                let count = 0
                for (const proposta of propostas[1]) {
                    if (proposta.idade <= 8 && proposta.tipoAssociado === 'Dependente') {
                        count++;
                    }
                }
                if (propostas[1].length - 1 === count && count !== 0) {
                    return propostas[1];
                }
            }).flat()
        }
        if (filter === 'titular com depente maior de 18 anos') {
            filtradas = Object.entries(cpfsTitulares).filter(propostas => propostas[1].length > 1 && propostas[1].every(proposta => proposta.idade >= 18)).map(propostas => {
                return propostas[1];
            }).flat()
        }
        if (filter === 'titular com dependente maior de 18 anos e menor de 9 anos') {
            filtradas = Object.entries(cpfsTitulares).map(propostas => {
                let countMenor = 0
                let countMaior = 0
                for (const proposta of propostas[1]) {
                    if (proposta.idade >= 18 && proposta.tipoAssociado === 'Dependente') {
                        countMaior++;
                    }
                    if (proposta.idade <= 8 && proposta.tipoAssociado === 'Dependente') {
                        countMenor++;
                    }
                }
                if (propostas[1].length - 1 === countMaior + countMenor && countMenor !== 0 && countMaior !== 0 && propostas[1].length >= 3) {
                    return propostas[1];
                }
            }).flat()
        }
        if (filter === 'titular com dependente maior de 9 anos e menor de 17 anos') {
            filtradas = Object.entries(cpfsTitulares).map(propostas => {
                let count = 0
                for (const proposta of propostas[1]) {
                    if (proposta.idade >= 9 && proposta.idade <= 17 && proposta.tipoAssociado === 'Dependente') {
                        count++;
                    }
                }
                if (count >= 1) {
                    return propostas[1];
                }
            }).flat()
        }
        if (filter === 'todas') {
            filtradas = result
        }

        filtradas = filtradas.filter(proposta => proposta !== undefined).flat();

        propostasSemDependentesEntre9a17 = propostasSemDependentesEntre9a17.filter(proposta => proposta !== undefined).flat();

        return res.json({ result, propostasSemDependentes: propostasSemDependentesEntre9a17, filtradas })
    },

    semResposta: async (req, res) => {
        try {

            const result = await PropostaEntrevista.find({
                $and: [
                    { status: { $ne: 'Concluído' } },
                    { status: { $ne: 'Cancelado' } },
                    { agendado: { $ne: 'agendado' } },
                    { situacao: 'Enviada' }
                ]
            }).sort({ horarioEnviado: 1 }).lean()

            const semRespostaEmSeisHoras = result.filter(proposta => {
                return moment(proposta.horarioEnviado).add(6, 'hours') <= moment()
            })

            return res.json(semRespostaEmSeisHoras)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error",
                error
            })
        }
    },

    producaoIndividualAgendamentos: async (req, res) => {
        try {

            const { analista, mes } = req.params

            const totalPropostasMes = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes }
            })

            const totalAgendadas = await PropostaEntrevista.countDocuments({
                agendado: 'agendado',
                dataEntrevista: { $regex: mes }
            })

            const agendadasAnalista = await PropostaEntrevista.countDocuments({
                quemAgendou: analista,
                dataEntrevista: { $regex: mes }
            })

            const analistaQueMaisAgendou = await PropostaEntrevista.aggregate([
                {
                    $match: {
                        dataEntrevista: { $regex: mes }
                    }
                },
                {
                    $group: {
                        _id: '$quemAgendou',
                        total: { $sum: 1 }
                    }
                },
                {
                    $sort: { total: -1 }
                },
                {
                    $limit: 1
                }
            ])

            const mediaDeAgendamentosPorAnalista = await PropostaEntrevista.aggregate([
                {
                    $match: {
                        dataEntrevista: { $regex: mes }
                    }
                },
                {
                    $group: {
                        _id: '$quemAgendou',
                        total: { $sum: 1 }
                    }
                }
            ])

            const media = mediaDeAgendamentosPorAnalista.reduce((acc, cur) => {
                return acc + cur.total
            }, 0) / mediaDeAgendamentosPorAnalista.length

            const realizadaAgendada = await PropostaEntrevista.countDocuments({
                dataConclusao: { $regex: mes },
                agendado: 'agendado',
                enfermeiro: analista
            })

            const realizadaNaoAgendada = await PropostaEntrevista.countDocuments({
                dataConclusao: { $regex: mes },
                agendado: { $ne: 'agendado' },
                enfermeiro: analista
            })

            const quantidadePrimeiroContato = await PropostaEntrevista.countDocuments({
                contato1: { $regex: moment(mes).format('MM/YYYY') },
                responsavelContato1: analista
            })

            const quantidadeSegundoContato = await PropostaEntrevista.countDocuments({
                contato2: { $regex: moment(mes).format('MM/YYYY') },
                responsavelContato2: analista
            })

            const quantidadeTerceiroContato = await PropostaEntrevista.countDocuments({
                contato3: { $regex: moment(mes).format('MM/YYYY') },
                responsavelContato3: analista
            })

            const quantidadeHumanizado = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: 'agendado',
                statusAgendado: 'Humanizado',
                quemAgendou: analista
            })

            const quantidadeSemWhats = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: 'agendado',
                statusAgendado: 'Sem Whatsapp',
                quemAgendou: analista
            })

            const quantidadeJanela = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: 'agendado',
                statusAgendado: 'Janela',
                quemAgendou: analista
            })

            const quantidadadeCanceladoHumanizado = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: 'agendado',
                statusAgendado: 'Cancelado humanizado',
                quemAgendou: analista
            })

            const object = {
                totalPropostasMes,
                totalAgendadas,
                agendadasAnalista,
                analistaQueMaisAgendou,
                mediaDeAgendamentosPorAnalista,
                media,
                realizadaAgendada,
                realizadaNaoAgendada,
                quantidadePrimeiroContato,
                quantidadeSegundoContato,
                quantidadeTerceiroContato,
                quantidadeHumanizado,
                quantidadeSemWhats,
                quantidadeJanela,
                quantidadadeCanceladoHumanizado
            }

            return res.json(object)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error",
                error
            })
        }
    },

    comparativoAgendamentos: async (req, res) => {
        try {

            const { analista, mes } = req.params

            const analistaQueMaisAgendou = await PropostaEntrevista.aggregate([
                {
                    $match: {
                        dataEntrevista: { $regex: mes }
                    }
                },
                {
                    $group: {
                        _id: '$quemAgendou',
                        total: { $sum: 1 }
                    }
                },
                {
                    $sort: { total: -1 }
                },
                {
                    $limit: 1
                }
            ])

            const agendadasAnalista = await PropostaEntrevista.find({
                quemAgendou: analista,
                dataEntrevista: { $regex: mes }
            }).lean()

            const agendadasAnalistaQueMaisAgendou = await PropostaEntrevista.find({
                quemAgendou: analistaQueMaisAgendou[0]._id,
                dataEntrevista: { $regex: mes }
            }).lean()

            const agendadasMes = await PropostaEntrevista.find({
                dataEntrevista: { $regex: mes }
            }, {
                dataEntrevista: 1
            }).lean()

            console.log(agendadasAnalistaQueMaisAgendou.length, agendadasAnalista.length);

            // Crie um array de datas para o eixo x
            let dates = [];

            for (const item of agendadasMes) {
                if (!dates.includes(item.dataEntrevista.split(' ')[0])) {
                    dates.push(item.dataEntrevista.split(' ')[0])
                }
            }

            dates = dates.sort((a, b) => {
                return new Date(a) - new Date(b)
            })

            console.log(dates);

            // Crie um array de objetos com as datas e a quantidade de agendamentos

            let series = [
                {
                    name: analista,
                    data: []
                },
                {
                    name: analistaQueMaisAgendou[0]._id,
                    data: []
                }
            ];

            for (const date of dates) {
                series[0].data.push(agendadasAnalista.filter(e => e.dataEntrevista.split(' ')[0] === date).length)
                series[1].data.push(agendadasAnalistaQueMaisAgendou.filter(e => e.dataEntrevista.split(' ')[0] === date).length)
            }

            console.log(series);

            dates = dates.map(e => moment(e).format('DD/MM'))

            return res.json({ series, dates })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error",
                error
            })
        }
    },

    analiticoAgendamentoMensal: async (req, res) => {
        try {

            const { mes } = req.params

            const propostasRecebidas = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes }
            })

            const propostasAgendadas = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: 'agendado'
            })

            const propostasNaoAgendadas = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: { $ne: 'agendado' },
                status: { $ne: 'Concluído', $ne: 'Cancelado' },
            })

            const propostasNaoAgendadasEConcluidas = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: { $ne: 'agendado' },
                status: 'Concluído'
            })

            const propostasNaoAgendadasECanceladas = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: { $ne: 'agendado' },
                status: 'Cancelado'
            })

            const quantidadeHumanizado = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: 'agendado',
                statusAgendado: 'Humanizado'
            })

            const quantidadeSemWhats = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: 'agendado',
                statusAgendado: 'Sem Whatsapp'
            })

            const quantidadeJanela = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: 'agendado',
                statusAgendado: 'Janela'
            })

            const quantidadadeCanceladoHumanizado = await PropostaEntrevista.countDocuments({
                dataRecebimento: { $regex: mes },
                agendado: 'agendado',
                statusAgendado: 'Cancelado humanizado'
            })

            return res.json({
                propostasRecebidas,
                propostasAgendadas,
                propostasNaoAgendadas,
                propostasNaoAgendadasEConcluidas,
                propostasNaoAgendadasECanceladas,
                quantidadeHumanizado,
                quantidadeSemWhats,
                quantidadeJanela,
                quantidadadeCanceladoHumanizado
            })

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error",
                error
            })
        }
    },

    graficoPropostasAgendadas: async (req, res) => {
        try {

            const { mes } = req.params

            const result = await PropostaEntrevista.find({
                dataEntrevista: { $regex: mes }
            }).lean()

            let data = [
                //{ x: 'Dia/Mes/Ano', y: 54 },
            ]

            for (const item of result) {

                const key = moment(item.dataEntrevista).format('YYYY-MM-DD')

                const index = data.findIndex(e => e.x === key)

                if (index === -1) {
                    data.push({
                        x: key,
                        y: 1
                    })
                } else {
                    data[index].y += 1
                }
            }

            data = data.map(e => {
                return {
                    x: moment(e.x).format('DD/MM'),
                    y: e.y
                }
            }).sort((a, b) => {
                const dateA = new Date(a.x.split('/').reverse().join('-'));
                const dateB = new Date(b.x.split('/').reverse().join('-'));
                return dateA - dateB;
            });

            return res.json(data)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error",
                error
            })
        }
    },

    producaoAnalistasAgendamento: async (req, res) => {
        try {

            const { mes } = req.params

            const diasUteis = countWeekdaysInMonth(mes.split('-')[0], mes.split('-')[1] - 1)

            let result = await PropostaEntrevista.aggregate([
                {
                    $match: {
                        dataEntrevista: { $regex: mes }
                    }
                },
                {
                    $group: {
                        _id: '$quemAgendou',
                        total: { $sum: 1 },
                    }
                }
            ])

            result = result.map(item => {
                return {
                    ...item,
                    media: item.total / diasUteis
                }
            }).sort((a, b) => b.total - a.total)

            console.log(result);

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error",
                error
            })
        }
    },

    producaoConcluidasSemAgendar: async (req, res) => {
        try {

            const { mes } = req.params

            let result = await PropostaEntrevista.aggregate([
                {
                    $match: {
                        dataConclusao: { $regex: mes },
                        agendado: { $ne: 'agendado' }
                    }
                },
                {
                    $group: {
                        _id: '$enfermeiro',
                        total: { $sum: 1 }
                    }
                }
            ])

            result = result.sort((a, b) => b.total - a.total)

            return res.json(result)

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                msg: "Internal Server Error",
                error
            })
        }
    }
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
    moment('2023-12-25'),
    moment('2024-01-01'),
    moment('2024-02-12'),
    moment('2024-02-13'),
    moment('2024-03-29'),
    moment('2024-04-21'),
    moment('2024-05-01'),
    moment('2024-05-30'),
    moment('2024-09-07'),
    moment('2024-10-12'),
    moment('2024-11-02'),
    moment('2024-11-15'),
    moment('2024-11-20'),
    moment('2024-12-25'),
];