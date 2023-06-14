const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const TwilioNumber = process.env.TWILIO_NUMBER
const moment = require('moment')
require('moment-business-days')

const PropostaEntrevista = require('../models/PropostaEntrevista')
const Chat = require('../models/Chat')

async function reenvimarMensagens() {

    const find = await PropostaEntrevista.find({
        situacao: 'Enviada',
        agendado: { $ne: 'agendado' },
        atendimentoHumanizado: { $ne: true },
        $and: [
            { status: { $ne: 'Concluído' } },
            { status: { $ne: 'Cancelado' } }
        ],
        vigencia: moment().format('YYYY-MM-DD'),
        reenviadoVigencia: undefined,
        tipoContrato: { $ne: undefined }
    })

    const msg = `Tentamos contato contigo para a realização da entrevista de complementação da contratação do seu plano de saúde, porém não obtivemos sucesso. Favor entrar em contato através do número *0800 042 0049* das 08:30 às 17:30 hrs de segunda à sexta, para o agendamento e realização da mesma para a continuidade na análise.`

    // await client.messages.create({
    //     from: TwilioNumber,
    //     to: 'whatsapp:+5541997971794',
    //     body: msg
    // })

    for (const proposta of find) {
        let vigencia = moment(proposta.vigencia)
        vigencia = vigencia.businessAdd(5).format('YYYY-MM-DD')

        if (proposta.tipoContrato.toLowerCase().indexOf('pf') !== -1) {

            console.log('enviou para ' + proposta.nome);

            // await PropostaEntrevista.updateOne({
            //     _id: proposta._id
            // }, {
            //     reenviadoVigencia: true,
            //     perguntaAtendimentoHumanizado: true,
            //     vigencia,
            // })

            // if (proposta.tipoAssociado === 'Titular') {
            //     await client.messages.create({
            //         from: TwilioNumber,
            //         to: proposta.whatsapp,
            //         body: msg
            //     })
            // }
        }
    }
}

module.exports = reenvimarMensagens