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

        // fs.readFile('src/utils/reenvio 27-08-24.csv', 'utf8', async (err, data) => {
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
        //             nome
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

        //                     const msg = `Prezado(a) Sr(a) ${findTitular.nome}, verificamos que consta pendente a entrevista do(s) seu(s) dependente(s). Solicitamos que acesse o link a seguir para realizar o agendamento. A Amil agradece e aguardo o seu contato.
        // https://wa.me/${findTitular.wppSender}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista.`

        //                     let wppSender = findTitular.wppSender

        //                     const messageTwilio = await client.messages.create({
        //                         from: wppSender,
        //                         // body: msg,
        //                         to: findTitular.whatsapp,
        //                         contentSid: 'HXee7778e84b9bcd574c5c819afaa06e59',
        //                         contentVariables: JSON.stringify({
        //                             '1': findTitular.nome,
        //                             '2': `https://wa.me/${findTitular.wppSender}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista.`
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
        //                         horarioEnviado: moment().format('YYYY-MM-DD HH:mm'),
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


        //             const msg = `Prezado(a) Sr(a) ${proposta.nome}, verificamos que consta pendente a entrevista do(s) seu(s) dependente(s). Solicitamos que acesse o link a seguir para realizar o agendamento. A Amil agradece e aguardo o seu contato.
        // https://wa.me/${proposta.wppSender}?text=Olá,%20gostaria%20de%20agendar%20meu%20horário%20para%20a%20entrevista.`

        //             let wppSender = proposta.wppSender

        //             const messageTwilio = await client.messages.create({
        //                 from: wppSender,
        //                 // body: msg,
        //                 to: proposta.whatsapp,
        //                 contentSid: 'HXee7778e84b9bcd574c5c819afaa06e59',
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
        //                 horarioEnviado: moment().format('YYYY-MM-DD HH:mm'),
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
            tipoContrato: 'ADESÃO',
            // $or: [
            //     {tentativasDeContato: {$size: 0}},
            //     {tentativasDeContato: {$size: 1}},
            //     {tentativasDeContato: {$size: 2}},
            //     {tentativasDeContato: {$size: 3}},
            // ]
        }).lean();

        let countEnviado = 0;
        for (const proposta of find) {

            try {
                if (proposta.whatsapp === 'whatsapp:+55' || proposta.whatsapp === 'whatsapp:+55undefinedundefined') {
                    continue;
                }

                if (proposta.wppSender === process.env.TWILIO_NUMBER) {
                    const mensagem = modeloMensagem2(proposta.nome, '03/09/2024', '04/09/2024');
                    console.log(proposta.whatsapp, mensagem.mensagem);

                    await sendMessage(proposta.wppSender, proposta.whatsapp, mensagem.mensagem);

                    await PropostaEntrevista.updateOne({
                        _id: proposta._id
                    }, {
                        opcaoDia1: '03/09/2024',
                        opcaoDia2: '04/09/2024',
                        perguntaAtendimentoHumanizado: true,
                        atendimentoHumanizado: false,
                    });

                    console.log('enviado antigo', proposta.whatsapp, proposta.nome);
                } else {
                    const msg = `Prezado(a) Sr(a), desculpe a demora em retornar. Podemos retomar o seu agendamento?
Se sim, por favor, digitar OK`

                    let wppSender = proposta.wppSender

                    if (wppSender === process.env.TWILIO_NUMBER) {
                        wppSender = 'whatsapp:+551150392183'
                    }

                    const messageTwilio = await client.messages.create({
                        from: wppSender,
                        // body: msg,
                        to: proposta.whatsapp,
                        contentSid: 'HX7f2a237a69f8b792eaa10eab3aa95ee2',
                        // contentVariables: JSON.stringify({
                        //     '1': proposta.nome
                        // }),
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
                        perguntaAtendimentoHumanizado: false,
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
                }
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

//reenviarMensagensVigencia();

// reenviarMensagensVigencia()

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
