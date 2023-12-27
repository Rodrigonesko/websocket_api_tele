const Chat = require("../models/Chat");
const PropostaEntrevista = require("../models/PropostaEntrevista");
const moment = require('moment');
require('moment-business-days')
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

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

async function encontrarPropostaPorWhatsapp(whatsapp) {
    return await PropostaEntrevista.findOne({
        whatsapp,
        status: { $nin: ['Cancelado', 'Concluído'] }
    });
}

module.exports = {
    sendMessage,
    createChatMessage,
    updatePropostaEntrevista,
    mandarParaAtendimentoHumanizado,
    agendaEntrevistaPorCpfTitular,
    agendaEntrevistaPorId,
    encontrarPropostaPorWhatsapp
}
