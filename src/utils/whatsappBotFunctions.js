const Chat = require("../models/Chat");
const Horario = require("../models/Horario");
const PropostaEntrevista = require("../models/PropostaEntrevista");
const moment = require('moment');
require('moment-business-days')
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const fs = require('fs');
const { modeloMensagem2 } = require("./functions");

async function updatePropostaEntrevista(find, status) {
    await PropostaEntrevista.updateOne({
        _id: find._id
    }, {
        statusWhatsapp: status
    });
}

async function createChatMessage(To, From, msg, messageTwilio) {
    await Chat.create({
        de: To,
        para: From,
        mensagem: msg,
        horario: moment().format('YYYY-MM-DD HH:mm'),
        status: messageTwilio.status,
        sid: messageTwilio.sid
    });
}

async function sendMessage(To, From, msg) {
    const messageTwilio = await client.messages.create({
        from: To,
        body: msg,
        to: From
    });

    await createChatMessage(To, From, msg, messageTwilio);

    return msg;
}

async function mandarParaAtendimentoHumanizado(find) {
    await PropostaEntrevista.updateOne({
        _id: find._id
    }, {
        atendimentoHumanizado: true
    });
}

async function agendaComOStatusPerguntaDependentes(find, enfermeira) {
    const update = await PropostaEntrevista.updateOne({
        _id: find._id
    }, {
        statusWhatsapp: 'Pergunta dependentes',
        atendimentoEncerrado: true,
        atendimentoHumanizado: false,
        agendado: 'agendado',
        situacao: 'Agendado',
        contato1: moment().format('YYYY-MM-DD HH:mm'),
        responsavelContato1: 'Bot Whatsapp',
        visualizado: true,
        enviadoTwilio: true,
        newStatus: 'Agendado',
        enfermeiro: enfermeira,
        quemAgendou: 'Bot Whatsapp',
        dataEntrevista: `${moment(find.diaEscolhido).format('YYYY-MM-DD')} ${find.horarioEscolhido}`,
    });

    return update;
}

async function agendaEntrevistaPorCpfTitular(find, enfermeira) {
    const update = await PropostaEntrevista.updateMany({
        cpfTitular: find.cpfTitular
    }, {
        statusWhatsapp: 'Horario confirmado',
        atendimentoEncerrado: true,
        atendimentoHumanizado: false,
        agendado: 'agendado',
        situacao: 'Agendado',
        contato1: moment().format('YYYY-MM-DD HH:mm'),
        responsavelContato1: 'Bot Whatsapp',
        visualizado: true,
        enviadoTwilio: true,
        newStatus: 'Agendado',
        enfermeiro: enfermeira,
        quemAgendou: 'Bot Whatsapp',
        dataEntrevista: `${moment(find.diaEscolhido).format('YYYY-MM-DD')} ${find.horarioEscolhido}`,
    });

    return update;
}

async function agendaEntrevistaPorId(find, enfermeira) {
    const update = await PropostaEntrevista.updateOne({
        _id: find._id
    }, {
        statusWhatsapp: 'Horario confirmado',
        atendimentoEncerrado: true,
        atendimentoHumanizado: false,
        agendado: 'agendado',
        situacao: 'Agendado',
        contato1: moment().format('YYYY-MM-DD HH:mm'),
        responsavelContato1: 'Bot Whatsapp',
        visualizado: true,
        enviadoTwilio: true,
        newStatus: 'Agendado',
        enfermeiro: enfermeira,
        quemAgendou: 'Bot Whatsapp',
        dataEntrevista: `${moment(find.diaEscolhido).format('YYYY-MM-DD')} ${find.horarioEscolhido}`,
    });

    await marcarHorario(find, enfermeira);

    return update;
}

async function agendarEntrevistaParaDependentesMenoresIdade(dadosTitular, dadosDependente, enfermeira) {
    const update = await PropostaEntrevista.updateOne({
        _id: dadosDependente._id
    }, {
        statusWhatsapp: 'Horario confirmado',
        atendimentoEncerrado: true,
        atendimentoHumanizado: false,
        agendado: 'agendado',
        situacao: 'Agendado',
        contato1: moment().format('YYYY-MM-DD HH:mm'),
        responsavelContato1: 'Bot Whatsapp',
        visualizado: true,
        enviadoTwilio: true,
        newStatus: 'Agendado',
        enfermeiro: enfermeira,
        quemAgendou: 'Bot Whatsapp',
        dataEntrevista: `${moment(dadosTitular.diaEscolhido).format('YYYY-MM-DD')} ${dadosTitular.horarioEscolhido}`,
    });

    await marcarHorario(dadosTitular, enfermeira);

    return update;
}

async function encontrarPropostaPorWhatsapp(whatsapp) {
    const result = await PropostaEntrevista.findOne({
        whatsapp,
        status: { $nin: ['Cancelado', 'Concluído'] }
    });

    if (result) {
        return result;
    } else {
        const result = await PropostaEntrevista.findOne({
            whatsapp
        });
        return result;
    }

}

async function marcarHorario(find, enfermeira) {
    const update = await Horario.updateOne({
        horario: find.horarioEscolhido,
        dia: find.diaEscolhido,
        enfermeiro: enfermeira
    }, {
        agendado: 'Agendado',
        nome: find._id
    })
    return update;
}

async function reenviarMensagensEmMassa() {
    try {

        fs.readFile('src/utils/base.csv', 'utf8', async (err, data) => {
            if (err) {
                console.log(err);
                return;
            }
            const array = data.split('\n')
            let contador = 0;
            for (const item of array) {
                let proposta = item.split(';')[0];
                let cpf = item.split(';')[2];
                console.log(cpf);
                cpf = String(cpf).replace(/\D/g, '');
                const find = await PropostaEntrevista.findOne({
                    cpf: cpf,
                    proposta
                })
                if (find) {
                    if (find.whatsapp === 'whatsapp:+55' || find.whatsapp === 'whatsapp:+55undefinedundefined') {
                        continue;
                    }
                    // ALTERAR OS DIAS DAS MENSAGENS PARA OS DIAS CORRETOS !!!!!!!!!
                    const mensagem = modeloMensagem2(find.nome, '19/02/2024', '20/02/2024');
                    await sendMessage(find.wppSender, find.whatsapp, mensagem.mensagem);
                    console.log('enviado', find.whatsapp, find.nome);
                } else {
                    console.log('nao encontrado');
                }
                contador++;
                console.log(contador);
            }
        })

    } catch (error) {
        console.log(error);
    }
}

async function reenviarMensagensVigencia() {
    try {

        // let find = []

        // fs.readFile('src/utils/reenviar 18-11.csv', 'utf8', async (err, data) => {
        //     if (err) {
        //         console.log(err);
        //         return;
        //     }
        //     const array = data.split('\n')
        //     let countEnviado = 0;
        //     for (const item of array) {
        //         let proposta = item.split(';')[0]?.trim();
        //         let nome = item.split(';')[1]?.trim();
        //         const findProposta = await PropostaEntrevista.findOne({
        //             proposta,
        //             nome,
        //             status: { $nin: ['Concluído', 'Cancelado'] },
        //             agendado: { $ne: 'agendado' }
        //         })
        //         if (!findProposta) continue;
        //         find.push(findProposta);
        //         console.log(findProposta._id);
        //     }
        //     for (const proposta of find) {
        //         try {
        //             if (proposta.whatsapp === 'whatsapp:+55' || proposta.whatsapp === 'whatsapp:+55undefinedundefined') {
        //                 const findTitular = await PropostaEntrevista.findOne({
        //                     cpf: proposta.cpfTitular,
        //                 });
        //                 if (findTitular) {

        //                     //                     const msg = `Prezado(a) Sr(a) ${proposta.nome}, verificamos que consta pendente Entrevista(s) em seu Plano de Saúde. Digite 1000 para Atendimento Humanizado OU acesse o link a seguir para realizar o agendamento automático. A Amil agradece e aguardo o seu contato.
        //                     // https://wa.me/${findTitular.wppSender}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista.`

        //                     const msg = `Prezado(a) Sr(a) ${findTitular.nome}, verificamos que consta pendente Entrevista(s) em seu Plano de Saúde do Grupo Amil. Acesse o link a seguir para realizar o agendamento automático 
        //                                 https://wa.me/${findTitular.wppSender}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista
        //                                 Caso encontre alguma dificuldade ou fique com alguma dúvida digite 1000 para Atendimento Humanizado. A Amil agradece e aguarda o seu contato.`

        //                     let wppSender = findTitular.wppSender

        //                     const messageTwilio = await client.messages.create({
        //                         from: wppSender,
        //                         // body: msg,
        //                         to: findTitular.whatsapp,
        //                         contentSid: 'HX5d6fa25f1fa882a55ef593f893dc030d',
        //                         contentVariables: JSON.stringify({
        //                             '1': findTitular.nome,
        //                             '2': `https://wa.me/${findTitular.wppSender}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista`
        //                         }),
        //                         messagingServiceSid: process.env.MESSAGING_SERVICE_SID
        //                     })

        //                     let statusMessage = await client.messages(messageTwilio.sid).fetch()

        //                     await Chat.create({
        //                         de: wppSender,
        //                         para: findTitular.whatsapp,
        //                         mensagem: msg,
        //                         horario: moment().format('YYYY-MM-DD HH:mm'),
        //                         status: statusMessage.status,
        //                         sid: messageTwilio.sid
        //                     })
        //                     await PropostaEntrevista.findByIdAndUpdate({
        //                         _id: proposta._id
        //                     }, {
        //                         statusWhatsapp: 'Saudacao enviada',
        //                         situacao: 'Enviada',
        //                         wppSender,
        //                         perguntaAtendimentoHumanizado: false,
        //                         atendimentoHumanizado: false,
        //                         $push: {
        //                             tentativasDeContato: {
        //                                 responsavel: 'Bot Whatsapp',
        //                                 data: moment().format('YYYY-MM-DD HH:mm'),
        //                                 canal: 'WHATSAPP'
        //                             }
        //                         }
        //                     })

        //                     countEnviado++;
        //                     console.log('enviado', proposta.whatsapp, proposta.nome);
        //                 }
        //                 continue;
        //             }


        //             const msg = `Prezado(a) Sr(a) ${proposta.nome}, verificamos que consta pendente Entrevista(s) em seu Plano de Saúde do Grupo Amil. Acesse o link a seguir para realizar o agendamento automático 
        //             https://wa.me/${proposta.wppSender}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista
        //             Caso encontre alguma dificuldade ou fique com alguma dúvida digite 1000 para Atendimento Humanizado. A Amil agradece e aguarda o seu contato.`

        //             let wppSender = proposta.wppSender

        //             const messageTwilio = await client.messages.create({
        //                 from: wppSender,
        //                 // body: msg,
        //                 to: proposta.whatsapp,
        //                 contentSid: 'HX5d6fa25f1fa882a55ef593f893dc030d',
        //                 contentVariables: JSON.stringify({
        //                     '1': proposta.nome,
        //                     '2': `https://wa.me/${proposta.wppSender}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista.`
        //                 }),
        //                 messagingServiceSid: process.env.MESSAGING_SERVICE_SID
        //             })

        //             let statusMessage = await client.messages(messageTwilio.sid).fetch()

        //             await Chat.create({
        //                 de: wppSender,
        //                 para: proposta.whatsapp,
        //                 mensagem: msg,
        //                 horario: moment().format('YYYY-MM-DD HH:mm'),
        //                 status: statusMessage.status,
        //                 sid: messageTwilio.sid
        //             })
        //             await PropostaEntrevista.findByIdAndUpdate({
        //                 _id: proposta._id
        //             }, {
        //                 statusWhatsapp: 'Saudacao enviada',
        //                 situacao: 'Enviada',
        //                 wppSender,
        //                 perguntaAtendimentoHumanizado: false,
        //                 atendimentoHumanizado: false,
        //                 $push: {
        //                     tentativasDeContato: {
        //                         responsavel: 'Bot Whatsapp',
        //                         data: moment().format('YYYY-MM-DD HH:mm'),
        //                         canal: 'WHATSAPP'
        //                     }
        //                 }
        //             })

        //             countEnviado++;
        //             console.log('enviado', proposta.whatsapp, proposta.nome);

        //         } catch (error) {
        //             console.log(error);
        //             continue;
        //         }
        //     }
        //     console.log(find.length);
        //     console.log('Enviado: ' + countEnviado);
        // })

        const find = await PropostaEntrevista.find({
            status: { $nin: ['Concluído', 'Cancelado'] },
            agendado: { $ne: 'agendado' },
            $or: [
                { dataRecebimento: '2024-11-18' },
                { dataRecebimento: '2024-11-14' },
            ],
        }).lean();

        let countEnviado = 0;
        for (const proposta of find) {

            try {
                if (proposta.whatsapp === 'whatsapp:+55' || proposta.whatsapp === 'whatsapp:+55undefinedundefined') {
                    continue;
                }

                const msg = `Prezado(a) Sr(a) ${proposta.nome}, verificamos que consta pendente Entrevista(s) em seu Plano de Saúde do Grupo Amil. Acesse o link a seguir para realizar o agendamento automático 
                     https://wa.me/${proposta.wppSender}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista
                     Caso encontre alguma dificuldade ou fique com alguma dúvida digite 1000 para Atendimento Humanizado. A Amil agradece e aguarda o seu contato.`

                let wppSender = proposta.wppSender

                const messageTwilio = await client.messages.create({
                    from: wppSender,
                    // body: msg,
                    to: proposta.whatsapp,
                    contentSid: 'HX5d6fa25f1fa882a55ef593f893dc030d',
                    contentVariables: JSON.stringify({
                        '1': proposta.nome,
                        '2': `https://wa.me/${proposta.wppSender}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista.`
                    }),
                    messagingServiceSid: process.env.MESSAGING_SERVICE_SID
                })

                let statusMessage = await client.messages(messageTwilio.sid).fetch()

                await Chat.create({
                    de: wppSender,
                    para: proposta.whatsapp,
                    mensagem: msg,
                    horario: moment().format('YYYY-MM-DD HH:mm'),
                    status: statusMessage.status,
                    sid: messageTwilio.sid
                })
                await PropostaEntrevista.findByIdAndUpdate({
                    _id: proposta._id
                }, {
                    statusWhatsapp: 'Saudacao enviada',
                    situacao: 'Enviada',
                    wppSender,
                    horarioEnviado: moment().format('YYYY-MM-DD HH:mm'),
                    perguntaAtendimentoHumanizado: true,
                    atendimentoHumanizado: false,
                    $push: {
                        tentativasDeContato: {
                            responsavel: 'Bot Whatsapp',
                            data: moment().format('YYYY-MM-DD HH:mm'),
                            canal: 'WHATSAPP'
                        }
                    }
                })

                countEnviado++;
                console.log('enviado', proposta.whatsapp, proposta.nome);

            } catch (error) {
                console.log(error);
                continue;
            }
        }
        console.log(find.length);
        console.log('Enviado: ' + countEnviado);

    } catch (error) {
        console.log(error);
    }
}

async function atualizarVigenciaAmil() {
    try {
        const arquivo = 'src/utils/vigencias.csv';
        const open = fs.readFileSync(arquivo, 'utf8');
        const array = open.split('\n');
        let contador = 0;
        for (const item of array) {
            const proposta = item.split(';')[0];
            const vigencia = item.split(';')[2];
            console.log(proposta, moment(vigencia, 'DD/MM/YYYY').format('YYYY-MM-DD'));
            await PropostaEntrevista.updateOne({
                proposta
            }, {
                vigencia: moment(vigencia, 'DD/MM/YYYY').format('YYYY-MM-DD')
            });
        }

    } catch (error) {
        console.log(error);
    }
}

async function whatsapps() {
    const propostas = await PropostaEntrevista.find({
        status: { $nin: ['Concluído', 'Cancelado'] },
        agendado: { $ne: 'agendado' },
        dataRecebimento: '2024-09-20',
        atendimentoHumanizado: { $ne: true },
        whatsapp: { $ne: 'whatsapp:+55' },
    }).lean();

    propostas.forEach((proposta) => {
        console.log(proposta.whatsapp);

    })
}

async function excluirPropostas() {
    let find = []

    fs.readFile('src/utils/excluir 31-10.csv', 'utf8', async (err, data) => {
        if (err) {
            console.log(err);
            return;
        }
        const array = data.split('\n')
        // let countEnviado = 0;
        for (const item of array) {
            let proposta = item.split(';')[0]?.trim();
            let nome = item.split(';')[1]?.trim();
            const findProposta = await PropostaEntrevista.findOne({
                proposta,
                nome
            })
            if (!findProposta) continue;
            find.push(findProposta);
            console.log(findProposta._id);
        }
        for (const proposta of find) {
            await PropostaEntrevista.findByIdAndDelete(proposta._id);
            console.log('excluido', proposta._id);
        }
        console.log(find.length);
    })
}

//excluirPropostas();

//whatsapps();

//reenviarMensagensVigencia();

//reenviarMensagensEmMassa();

module.exports = {
    sendMessage,
    createChatMessage,
    updatePropostaEntrevista,
    mandarParaAtendimentoHumanizado,
    agendaEntrevistaPorCpfTitular,
    agendaEntrevistaPorId,
    encontrarPropostaPorWhatsapp,
    agendaComOStatusPerguntaDependentes,
    marcarHorario,
    agendarEntrevistaParaDependentesMenoresIdade
}