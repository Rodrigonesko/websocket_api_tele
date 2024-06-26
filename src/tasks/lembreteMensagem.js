const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const TwilioNumber = process.env.TWILIO_NUMBER
const moment = require('moment')
const whatsappService = require('../services/whatsapp.service')

const PropostaEntrevista = require('../models/PropostaEntrevista')
const Chat = require('../models/Chat');
const { sendMessage } = require('../utils/whatsappBotFunctions');

async function lembreteMensagem() {

    const find = await PropostaEntrevista.find({
        agendado: 'agendado',
        $or: [
            { status: '' },
            { status: undefined }
        ]
    })

    for (const item of find) {
        const dataEntrevista = item.dataEntrevista
        const agora = moment().format('YYYY-MM-DD HH:mm:ss')

        const { wppSender } = item

        let whatsapp

        if (item.whatsapp.length === 23) {
            whatsapp = item.whatsapp
        } else {
            const findWhatsapp = await PropostaEntrevista.findOne({
                cpf: item.cpfTitular,
            })

            whatsapp = findWhatsapp?.whatsapp
        }

        if (verificarTempoEntreDatas(agora, dataEntrevista) && !item.lembrete) {

            const mensagem = `Sr (a) ${item.nome}, a equipe médica está finalizando um atendimento e, na sequência, entrará em contato contigo conforme o agendamento feito anteriormente. Informamos que vamos ligar dos números 11 42407120 ou 11 42403554, pedimos tirar do spam para evitar bloqueio da ligação. Essa entrevista dura em média de 8 a 10 minutos, orientamos que esteja em ambiente silencioso e sem interferências para evitar ruídos que possam interferir nas respostas, bem como na qualidade da ligação. Agradecemos desde já.`

            console.log(whatsapp, item.dataEntrevista, agora, item.nome);

            await PropostaEntrevista.updateOne({
                _id: item._id
            }, {
                lembrete: true
            })

            if (item.tipoContrato === 'ADESÃO') {
                await whatsappService.sendTemplateMessage(
                    'whatsapp:+551150394280',
                    whatsapp,
                    'HXbd2e62dcdd2bf7c5a9f4eb17db4ab2fd',
                    [item.nome, '(11) 4240-1232']
                )
            } else {
                await sendMessage(wppSender, whatsapp, mensagem)
            }

        }
    }
}

// Função para verificar se o tempo entre duas datas é de aproximadamente 10 minutos
function verificarTempoEntreDatas(date1, date2) {
    // Converte as datas para objetos Moment
    const momentDate1 = moment(date1);
    const momentDate2 = moment(date2);

    // Calcula a diferença em minutos entre as duas datas
    const diferencaEmMinutos = momentDate2.diff(momentDate1, 'minutes');

    if (diferencaEmMinutos < 0) {
        return false;
    }

    return diferencaEmMinutos < 10;
}


module.exports = lembreteMensagem