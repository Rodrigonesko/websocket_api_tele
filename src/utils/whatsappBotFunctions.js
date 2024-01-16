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
            for (const item of array) {
                let proposta = item.split(';')[2];
                let cpf = item.split(';')[4];
                const find = await PropostaEntrevista.findOne({
                    proposta,
                    cpf
                }).lean()
                if (find) {
                    if (find.whatsapp === 'whatsapp:+55') {
                        continue;
                    }
                    const mensagem = modeloMensagem2(find.nome, '15/01/2024', '15/01/2024');
                    await sendMessage(find.wppSender, find.whatsapp, mensagem.mensagem);
                    console.log('enviado', find.whatsapp, find.nome);
                } else {
                    console.log('nao encontrado');
                }
            }
        })



    } catch (error) {
        console.log(error);
    }
}


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
