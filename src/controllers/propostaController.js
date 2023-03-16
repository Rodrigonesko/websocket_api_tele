const mongoose = require('mongoose')
const PropostaEntrevista = require('../models/PropostaEntrevista')
const Chat = require('../models/Chat')
const moment = require('moment')
const businessDays = require('moment-business-days')
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const TwilioNumber = process.env.TWILIO_NUMBER

module.exports = {
    upload: async (req, res) => {
        try {
            const { result } = req.body

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

                if (tipoContrato !== 'Coletivo por Adesão com Administradora') {
                    vigencia = moment().businessAdd(2).format('YYYY-MM-DD')
                }

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

                const observacao = item['OBSERVAÇÕES']
                const ddd = item.NUM_DDD_CEL
                const numero = item.NUM_CEL?.toString()
                const telefone = `(${ddd}) ${numero}`

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
                    whatsapp
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
            const propostas = await PropostaEntrevista.find().sort('vigencia')

            return res.status(200).json({
                propostas
            })

        } catch (error) {
            return res.status(500).json({
                error: "Internal server error."
            })
        }
    },

    buscarPropostasNaoRealizadas: async (req, res) => {
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
                situacao: 'agendado'
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
                enfermeiro: ''
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
                situacao: 'Cancelado'
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
                    { status: { $ne: 'Concluído' } },
                    { status: { $ne: 'Cancelado' } }
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

    voltarEntrevista: async (req, res) => {
        try {

            const { nome, proposta } = req.body

            const result = await PropostaEntrevista.findOneAndUpdate({
                nome,
                proposta
            }, {
                status: ''
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

            console.log(tentativa, id);

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
                situacao: 'Concluído'
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

    enviarMensagem: async (req, res) => {
        try {

            const { proposta } = req.body

            let mensagem
            let opcaoDia1
            let opcaoDia2
            let modelo

            if (new Date().getTime() > new Date(moment().format('YYYY-MM-DD 13:00'))) {
                mensagem = modeloMensagem2(proposta.nome).mensagem
                opcaoDia1 = modeloMensagem2(proposta.nome).data1
                opcaoDia2 = modeloMensagem2(proposta.nome).data2
                modelo = '2'
            } else {
                mensagem = modeloMensagem1(proposta.nome).mensagem
                opcaoDia1 = modeloMensagem1(proposta.nome).data1
                opcaoDia2 = modeloMensagem1(proposta.nome).data2
                modelo = '1'
            }

            if (proposta.tipoAssociado === 'Dependente') {
                return res.json({ msg: 'Dependente' })
            }

            let whatsapp = proposta.whatsapp

            console.log(whatsapp);

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
                from: TwilioNumber,
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
                contato1: moment().format('YYYY-MM-DD HH:mm'),
                responsavelContato1: 'Bot Whatsapp',
            })

            const mensagemBanco = await Chat.create({
                de: TwilioNumber,
                para: whatsapp,
                mensagem,
                horario: moment().format('YYYY-MM-DD HH:mm')
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
                situacao
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

            console.log(from, mensagem);

            const insertChat = await Chat.create({
                de: fixed,
                para: TwilioNumber,
                mensagem,
                horario: moment().format('YYYY-MM-DD HH:mm')
            })

            const find = await PropostaEntrevista.findOne({
                whatsapp: fixed
            })

            if (!find) {
                //mandar mensagem para atendimento humanizado
                const msg = "Seu número não consta em nossa base de contatos"
                await client.messages.create({
                    from: TwilioNumber,
                    body: msg,
                    to: from
                })

                await Chat.create({
                    de: TwilioNumber,
                    para: fixed,
                    mensagem: msg,
                    horario: moment().format('YYYY-MM-DD HH:mm')
                })

                return res.json(msg)
            }

            if (find.status === 'Concluído') {
                const msg = "Atendimento encerrado, a Amil agradece"
                await client.messages.create({
                    from: TwilioNumber,
                    body: msg,
                    to: from
                })

                await Chat.create({
                    de: TwilioNumber,
                    para: fixed,
                    mensagem: msg,
                    horario: moment().format('YYYY-MM-DD HH:mm')
                })

                return res.json(msg)
            }

            if (isNaN(Number(mensagem))) {

                if (find.atendimentoHumanizado) {
                    return res.json(mensagem)
                }

                if (!find.perguntaAtendimentoHumanizado) {

                    await PropostaEntrevista.findOneAndUpdate({
                        whatsapp: fixed
                    }, {
                        perguntaAtendimentoHumanizado: true
                    })

                    console.log(TwilioNumber, from);

                    const msg = `Não entendemos sua resposta, por favor selecione o número referente a janela de horário que o Sr.(a) prefere.
                    Caso deseje falar com um atendente digite: sim`
                    await client.messages.create({
                        from: TwilioNumber,
                        body: msg,
                        to: from
                    })

                    await Chat.create({
                        de: TwilioNumber,
                        para: fixed,
                        mensagem: msg,
                        horario: moment().format('YYYY-MM-DD HH:mm')
                    })

                    return res.json(msg)
                }

                if (find.perguntaAtendimentoHumanizado) {
                    if (mensagem.toLowerCase().trim() === 'sim') {
                        await PropostaEntrevista.findOneAndUpdate({
                            cpfTitular: find.cpfTitular
                        }, {
                            atendimentoHumanizado: true
                        })

                        const msg = 'Um dos nossos atendentes irá entrar em contato dentro de 1 a 2 minutos.'

                        await client.messages.create({
                            from: TwilioNumber,
                            body: msg,
                            to: from
                        })

                        await Chat.create({
                            de: TwilioNumber,
                            para: fixed,
                            mensagem: msg,
                            horario: moment().format('YYYY-MM-DD HH:mm')
                        })

                        return res.json(msg)
                    }
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
                            atendimentoHumanizado: false
                        })
                        break;
                    case 2:
                        console.log(`Das 15:00 às 17:00`, find.opcaoDia1);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 15:00 às 17:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 3:
                        console.log(`Das 17:00 às 19:00`, find.opcaoDia1);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 17:00 às 19:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 4:
                        console.log(`Das 19:00 às 21:00`, find.opcaoDia1);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 19:00 às 21:000 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 5:
                        console.log(`Das 09:00 às 11:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 09:00 às 11:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 6:
                        console.log(`Das 11:00 às 13:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 11:00 às 13:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 7:
                        console.log(`Das 13:00 às 15:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 13:00 às 15:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 8:
                        console.log(`Das 15:00 às 17:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 15:00 às 17:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 9:
                        console.log(`Das 17:00 às 19:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 17:00 às 19:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 10:
                        console.log(`Das 19:00 às 21:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 19:00 às 21:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
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
                            atendimentoHumanizado: false
                        })
                        break;
                    case 2:
                        console.log(`Das 11:00 às 13:00`, find.opcaoDia1);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 11:00 às 13:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 3:
                        console.log(`Das 13:00 às 15:00`, find.opcaoDia1);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 13:00 às 15:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 4:
                        console.log(`Das 15:00 às 17:00`, find.opcaoDia1);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 15:00 às 17:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 5:
                        console.log(`Das 17:00 às 19:00`, find.opcaoDia1);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 17:00 às 19:00 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 6:
                        console.log(`Das 19:00 às 21:00`, find.opcaoDia1);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 19:00 às 21:000 ${find.opcaoDia1}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 7:
                        console.log(`Das 09:00 às 11:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 09:00 às 11:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 8:
                        console.log(`Das 11:00 às 13:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 11:00 às 13:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 9:
                        console.log(`Das 13:00 às 15:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 13:00 às 15:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 10:
                        console.log(`Das 15:00 às 17:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 15:00 às 17:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 11:
                        console.log(`Das 17:00 às 19:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 17:00 às 19:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
                        })
                        break;
                    case 12:
                        console.log(`Das 19:00 às 21:00`, find.opcaoDia2);
                        await PropostaEntrevista.updateMany({
                            cpfTitular: find.cpfTitular
                        }, {
                            janelaHorario: `Das 19:00 às 21:00 ${find.opcaoDia2}`,
                            situacao: 'Janela escolhida',
                            atendimentoHumanizado: false
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

            let mensagem = modeloMensagem2('Rodrigo').mensagem

            const result = await client.messages.create({
                from: TwilioNumber,
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
                    { situacao: 'Problemas ao Enviar' },
                    { situacao: 'Sem whatsapp' },
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
                situacao: 'Janela escolhida',
                janelaHorario: { $ne: undefined },
                agendado: { $ne: 'Agendado' }
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

    atendimentoHumanizado: async (req, res) => {
        try {

            const result = await PropostaEntrevista.find({
                atendimentoHumanizado: true
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

    migrarBanco: async (req, res) => {
        try {

            const { propostas } = req.body

            console.log(propostas.length);

            for (const item of propostas) {
                await PropostaEntrevista.create(item)
            }

            return res.json({ msg: 'ok' })

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
                    parte1 = `Somos da equipe de adesão da operadora de saúde Amil e para concluirmos a contratação do Plano de Saúde do Sr. e `
                } else {
                    saudacao = `Prezada Sra. ${item.titular.nome}, `
                    parte1 = `Somos da equipe de adesão da operadora de saúde Amil e para concluirmos a contratação do Plano de Saúde da Sra. e `
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
                    parte5.push(`*${data1}*`, 'Das 09:00 às 11:00', 'Das 11:00 às 13:00', 'Das 13:00 às 15:00', 'Das 15:00 às 17:00', 'Das 17:00 às 19:00', 'Das 19:00 às 21:00', `*${data2}*`, 'Das 09:00 às 11:00', 'Das 11:00 às 13:00', 'Das 13:00 às 15:00', 'Das 15:00 às 17:00', 'Das 17:00 às 19:00', 'Das 19:00 às 21:00')
                } else {
                    parte5.push(`*${data1}*`, 'Das 13:00 às 15:00', 'Das 15:00 às 17:00', 'Das 17:00 às 19:00', 'Das 19:00 às 21:00', `*${data2}*`, 'Das 09:00 às 11:00', 'Das 11:00 às 13:00', 'Das 13:00 às 15:00', 'Das 15:00 às 17:00', 'Das 17:00 às 19:00', 'Das 19:00 às 21:00')
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

function modeloMensagem1(nome) {
    let data1 = moment().format('DD/MM/YYYY')
    let data2 = moment().add(1, 'day').format('DD/MM/YYYY')
    if (moment().format('dddd') === 'Friday') {
        data1 = moment().format('DD/MM/YYYY')
        data2 = moment().add(3, 'days').format('DD/MM/YYYY')
    }

    let mensagem = `Prezado Sr.(a) ${nome},
    Somos da equipe de adesão da operadora de saúde Amil e para concluírmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) e precisamos confirmar alguns dados para que a contratação seja concluída.
    Por gentileza escolha duas janelas de horários para entrarmos em contato com o Sr.(a)
    *${data1}*
    1. Das 13:00 às 15:00
    2. Das 15:00 às 17:00
    3. Das 17:00 às 19:00
    4. Das 19:00 às 21:00
    *${data2}*
    5. Das 09:00 às 11:00
    6. Das 11:00 às 13:00
    7. Das 13:00 às 15:00
    8. Das 15:00 às 17:00
    9. Das 17:00 às 19:00
    10. Das 19:00 às 21:00
    Qual o melhor horário?
    Informamos que vamos ligar dos números 11 42404975 ou 42403554, pedimos tirar do spam para evitar bloqueio da ligação. Desde já agradecemos.
    Atenção: o preenchimento dos horários é feito em tempo real. Caso o horário informado não esteja mais disponível, apresentarei uma nova opção.`

    return { data1, data2, mensagem }
}

function modeloMensagem2(nome) {
    let data1 = moment().add(1, 'day').format('DD/MM/YYYY')
    let data2 = moment().add(2, 'day').format('DD/MM/YYYY')
    if (moment().format('dddd') === 'Friday') {
        data1 = moment().add(3, 'days').format('DD/MM/YYYY')
        data2 = moment().add(4, 'days').format('DD/MM/YYYY')
    }
    if (moment().format('dddd') === 'Thursday') {
        data1 = moment().add(1, 'day').format('DD/MM/YYYY')
        data2 = moment().add(4, 'days').format('DD/MM/YYYY')
    }

    let mensagem = `Prezado Sr.(a) ${nome},
    Somos da equipe de adesão da operadora de saúde Amil e para concluírmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) e precisamos confirmar alguns dados para que a contratação seja concluída.
    Por gentileza escolha duas janelas de horários para entrarmos em contato com o Sr.(a)
    *${data1}*
    1. Das 09:00 às 11:00
    2. Das 11:00 às 13:00
    3. Das 13:00 às 15:00
    4. Das 15:00 às 17:00
    5. Das 17:00 às 19:00
    6. Das 19:00 às 21:00
    *${data2}*
    7. Das 09:00 às 11:00
    8. Das 11:00 às 13:00
    9. Das 13:00 às 15:00
    10. Das 15:00 às 17:00
    11. Das 17:00 às 19:00
    12. Das 19:00 às 21:00
    Qual o melhor horário?
    Informamos que vamos ligar dos números 11 42404975 ou 42403554, pedimos tirar do spam para evitar bloqueio da ligação. Desde já agradecemos.
    Atenção: o preenchimento dos horários é feito em tempo real. Caso o horário informado não esteja mais disponível, apresentarei uma nova opção.`

    return { data1, data2, mensagem }
}