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

        const find = await PropostaEntrevista.find({
            dataRecebimento: { $gte: '2024-04-05', $lte: '2024-04-30' }
            ,
            status: 'Cancelado'
        }).lean()

        for (const proposta of find) {

            try {
                if (proposta.whatsapp === 'whatsapp:+55' || proposta.whatsapp === 'whatsapp:+55undefinedundefined') {
                    continue;
                }

                if (proposta.wppSender === process.env.TWILIO_NUMBER) {
                    const mensagem = modeloMensagem2(proposta.nome, '15/05/2024', '16/05/2024');
                    console.log(proposta.whatsapp, mensagem.mensagem);

                    await sendMessage(proposta.wppSender, proposta.whatsapp, mensagem.mensagem);

                    await PropostaEntrevista.updateOne({
                        _id: proposta._id
                    }, {
                        opcaoDia1: '15/05/2024',
                        opcaoDia2: '16/05/2024',
                        perguntaAtendimentoHumanizado: true,
                        atendimentoHumanizado: false,
                    });

                    console.log('enviado antigo', proposta.whatsapp, proposta.nome);
                } else {
                    const msg = `Prezado Sr. (a) ${proposta.nome},
                Somos da Área de Implantação da Amil e para concluirmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) precisamos confirmar alguns dados médicos.
                Por gentileza, poderia responder essa mensagem para podermos seguir com o atendimento?`

                    let wppSender = proposta.wppSender

                    if (wppSender === process.env.TWILIO_NUMBER) {
                        wppSender = 'whatsapp:+551150392183'
                    }

                    const messageTwilio = await client.messages.create({
                        from: wppSender,
                        body: msg,
                        to: proposta.whatsapp,
                        contentSid: 'HXaefa3495a5af5e72491eaaea5dda9be9',
                        contentVariables: JSON.stringify({
                            nome: proposta.nome
                        })
                    })

                    let statusMessage = await client.messages(messageTwilio.sid).fetch()

                    await Chat.create({
                        de: wppSender,
                        para: proposta.whatsapp,
                        mensagem: msg,
                        horario: moment().format('YYYY-MM-DD HH:mm'),
                        status: messageTwilio.status,
                        sid: messageTwilio.sid
                    })

                    await PropostaEntrevista.findByIdAndUpdate({
                        _id: proposta._id
                    }, {
                        statusWhatsapp: 'Saudacao enviada',
                        situacao: 'Enviada',
                        wppSender,
                        horarioEnviado: moment().format('YYYY-MM-DD HH:mm'),
                        responsavelContato1: 'Bot Whatsapp',
                        contato1: moment().format('YYYY-MM-DD HH:mm'),
                        perguntaAtendimentoHumanizado: false,
                        atendimentoHumanizado: false,
                    })

                    console.log('enviado', proposta.whatsapp, proposta.nome);
                }
            } catch (error) {
                console.log(error);
                continue;
            }
        }

        console.log(find.length);

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
