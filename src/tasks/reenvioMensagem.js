const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const TwilioNumber = process.env.TWILIO_NUMBER
const moment = require('moment')
require('moment-business-days')

const PropostaEntrevista = require('../models/PropostaEntrevista')
const Chat = require('../models/Chat')

async function reenviarMensagens() {

    const horaAtual = new Date().getHours();
    const minutosAtual = new Date().getMinutes();

    const horaInicio = 15;
    const minutosInicio = 0;
    const horaFim = 17;
    const minutosFim = 0;

    if (
        !((horaAtual > horaInicio && horaAtual < horaFim) ||
            (horaAtual === horaInicio && minutosAtual >= minutosInicio) ||
            (horaAtual === horaFim && minutosAtual <= minutosFim))
    ) {
        return
    }

    const find = await PropostaEntrevista.find({
        $and: [
            { agendado: { $ne: 'agendado' } },
            { status: { $ne: 'Concluído' } },
            { status: { $ne: 'Cancelado' } },
            { tipoAssociado: { $regex: 'Titular.' } },
            { reenviadoVigencia: { $ne: true } }
        ]
    }).sort('vigencia')

    const msg = `Tentamos contato contigo para a realização da entrevista de complementação da contratação do seu plano de saúde, porém não obtivemos sucesso. Favor entrar em contato através do número *0800 042 0049* das 08:30 às 17:30 hrs de segunda à sexta, para o agendamento e realização da mesma para a continuidade na análise.`

    for (const proposta of find) {

        let vigencia = moment(proposta.vigencia)

        if (proposta.tipoContrato.toLowerCase().indexOf('pf') !== -1 && vigencia < moment()) {

            console.log(vigencia < moment(), vigencia.format('DD/MM/YYYY'), moment().format('DD/MM/YYYY'));
            console.log('enviou para ' + proposta.proposta, proposta.situacao);
            vigencia = vigencia.businessAdd(5).format('YYYY-MM-DD')

            await PropostaEntrevista.updateMany({
                cpfTitular: proposta.cpfTitular
            }, {
                reenviadoVigencia: true,
                perguntaAtendimentoHumanizado: true,
                vigencia,
            })

            await client.messages.create({
                from: TwilioNumber,
                to: proposta.whatsapp,
                body: msg
            })

            await Chat.create({
                de: TwilioNumber,
                para: proposta.whatsapp,
                mensagem: msg,
                horario: moment().format('YYYY-MM-DD HH:mm')
            })
        }
    }
}

module.exports = reenviarMensagens