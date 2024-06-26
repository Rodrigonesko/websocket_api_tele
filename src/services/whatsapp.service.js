const Chat = require('../models/Chat');
const Proposta = require('../models/PropostaEntrevista');
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SERVICE_SID = process.env.MESSAGING_SERVICE_SID;
const client = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);
const { io } = require('../../index');
const moment = require('moment');

class WhatsappService {
    constructor() { }

    async sendTemplateMessage(de, para, template, variaveis, usuario) {
        const contentVariables = variaveis.reduce((acc, cur, index) => {
            acc[index + 1] = cur;
            return acc;
        }, {});

        const response = await client.messages.create({
            contentSid: template,
            from: de,
            to: para,
            contentVariables: JSON.stringify(contentVariables),
            messagingServiceSid: MESSAGING_SERVICE_SID
        });

        const chat = await Chat.create({
            de,
            para,
            mensagem: response.body,
            horario: moment().format('YYYY-MM-DD HH:mm:ss'),
            lida: false,
            status: response.status,
            sid: response.sid,
            quemEnviou: usuario,
            arquivo: null,
            errorCode: response.errorCode
        })

        io.emit('message', chat)

        return chat;
    }

    async sendMessage(de, para, mensagem, usuario) {
        const response = await client.messages.create({
            from: de,
            to: para,
            body: mensagem,
            messagingServiceSid: MESSAGING_SERVICE_SID
        });

        const chat = await Chat.create({
            de,
            para,
            mensagem: response.body,
            horario: moment().format('YYYY-MM-DD HH:mm:ss'),
            lida: false,
            status: response.status,
            sid: response.sid,
            quemEnviou: usuario,
            arquivo: null,
            errorCode: response.errorCode
        })

        io.emit('message', chat)

        return chat;
    }

    async receiveMessage(body) {
        let { From, To, Body, SmsMessageSid } = body;

        if (From.length === 22) {
            let firstPart = From.slice(0, 14);
            let lastPart = From.slice(14);
            From = `${firstPart}9${lastPart}`;
        }

        const response = await Chat.create({
            de: From,
            para: To,
            mensagem: Body,
            horario: moment().format('YYYY-MM-DD HH:mm:ss'),
            lida: false,
            status: 'received',
            sid: SmsMessageSid,
            quemEnviou: 'cliente',
            arquivo: null,
            errorCode: null
        })

        const proposta = await Proposta.findOne({
            whatsapp: From
        })

        io.emit('receivedMessage', {
            whatsapp: From,
            mensagem: Body,
            responsavel: proposta?.responsavelConversa,
            enfermeo: proposta?.enfermeiro,
            nome: proposta?.nome,
            proposta: proposta?.proposta
        })

        return response;
    }

    async updateStatus(sid, status) {
        const chat = await Chat.findOneAndUpdate({
            sid
        }, {
            status
        }, {
            new: true
        })

        io.emit('message', chat)

        return chat;
    }

}

module.exports = new WhatsappService();