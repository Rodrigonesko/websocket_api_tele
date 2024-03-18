const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const moment = require('moment')

const PropostaEntrevista = require('../models/PropostaEntrevista')
const Chat = require('../models/Chat');
const { atendimentoHumanizado } = require('../controllers/propostaController');

async function enviarHumanizado() {
    const propostas = await PropostaEntrevista.find({
        $and: [
            { agendado: { $ne: 'agendado' } },
            { status: { $ne: 'Concluído' } },
            { status: { $ne: 'Cancelado' } },
            {
                $or: [
                    { statusWhatsapp: 'Dia enviado' },
                    { statusWhatsapp: 'Horário enviado' },
                    { statusWhatsapp: 'Confirmação de Horario' },
                    { statusWhatsapp: 'Saudacao enviada' },
                ]
            },
            { atendimentoHumanizado: { $ne: true } },
            { dataRecebimento: { $gte: moment().subtract(1, 'days').format('YYYY-MM-DD') } }
        ]
    }).lean()

    let countDependentes = 0
    for (const proposta of propostas) {
        const diff = moment().diff(proposta.horarioEnviado, 'hours')
        if (diff > 6) {
            if (proposta.tipoAssociado.indexOf('Dependente') !== -1) {
                const titular = await PropostaEntrevista.findOne({ cpf: proposta.cpfTitular, tipoAssociado: 'Titular' })
                console.log(`Olá, detectamos que ainda não foi agendado o dependente ${proposta.nome} do titular ${titular.nome} com a proposta ${proposta.proposta} e o CPF ${proposta.cpf}. Por favor, nos informe o melhor horário para contato.`);
                countDependentes++
            } else {
                console.log(`Olá, detectamos que ainda não foi agendado o titular ${proposta.nome} com a proposta ${proposta.proposta} e o CPF ${proposta.cpf}. Por favor, nos informe o melhor horário para contato.`);
            }
        }
    }
    console.log(countDependentes, 'dependentes com mais de 6 horas de envio');
}

module.exports = enviarHumanizado