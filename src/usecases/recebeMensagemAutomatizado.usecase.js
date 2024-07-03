const Proposta = require('../models/PropostaEntrevista');
const Chat = require('../models/Chat');
const moment = require('moment');
require('moment-business-days');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

class RecebeMensagemAutomatizadoUsecase {
    constructor() { }

    async exec(body) {

        let {
            SmsSid,
            SmsStatus,
            MessageSid,
            AccountSid,
            From,
            To,
            Body,
            NumMedia,
            ProfileName,
            WaId,
            MediaContentType0,
            MediaUrl0,k
        } = body

        From = this.verificaTamanhoNumero(From);

        await Chat.create({
            de: From,
            para: To,
            mensagem: Body,
            horario: moment().format('YYYY-MM-DD HH:mm'),
            arquivo: MediaUrl0
        })

        if (!this.verificaDiaHorarioAtendimento()) {
            const msg = 'Olá, nosso horário de atendimento é de segunda a sexta das 08:30 às 17:30, responderemos sua mensagem assim que possível. A amil agradece seu contato.'
            const messageTwilio = await client.messages.create({
                from: To,
                body: msg,
                to: From,
            })
            await Chat.create({
                de: To,
                para: From,
                mensagem: msg,
                horario: moment().format('YYYY-MM-DD HH:mm:ss'),
                lida: false,
                status: messageTwilio.status,
                sid: messageTwilio.sid,
                quemEnviou: ProfileName,
                arquivo: null,
                errorCode: messageTwilio.errorCode
            })
            return msg
        }

        const find = await Proposta.findOne({
            whatsapp: From,
            status: { $nin: ['Cancelado', 'Concluído'] }
        }).lean()

        if (!find) {

        }
    }


    verificaTamanhoNumero(whatsapp) {
        if (whatsapp.length === 22) {
            let firstPart = whatsapp.slice(0, 14);
            let lastPart = whatsapp.slice(14);
            return `${firstPart}9${lastPart}`;
        }
        return whatsapp;
    }

    verificaDiaHorarioAtendimento() {
        const dia = moment().format('dddd');
        const horario = moment().format('HH:mm');
        if (dia === 'Saturday' || dia === 'Sunday') {
            return false;
        }
        if (horario < '09:00' || horario > '18:00') {
            return false;
        }
        return true;
    }
}

module.exports = new RecebeMensagemAutomatizadoUsecase();