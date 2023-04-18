const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const TwilioNumber = process.env.TWILIO_NUMBER

const PropostaEntrevista = require('../models/PropostaEntrevista')
const Chat = require('../models/Chat')

async function lembreteMensagem() {

    const find = await PropostaEntrevista.find({
        agendado: 'agendado',
        $or: [
            { status: '' },
            { status: undefined }
        ]
    })

    for (const item of find) {
        const dataEntrevista = new Date(item.dataEntrevista)
        const agora = new Date()

        const findWhatsapp = await PropostaEntrevista.findOne({
            cpf: item.cpfTitular,
        })

        const whatsapp = findWhatsapp?.whatsapp


        if (verificarTempoEntreDatas(agora, dataEntrevista) && !item.lembrete) {

            const mensagem = `Sr (a) ${item.nome}, a equipe médica está finalizando um atendimento e, na sequência, entrará em contato contigo conforme o agendamento feito anteriormente. Informamos que vamos ligar dos números 11 42404975 ou 11 42403554, pedimos tirar do spam para evitar bloqueio da ligação. Essa entrevista dura em média de 8 a 10 minutos, orientamos que esteja em ambiente silencioso e sem interferências para evitar ruídos que possam interferir nas respostas, bem como na qualidade da ligação. Agradecemos desde já.`

            console.log(whatsapp, dataEntrevista, agora);

            await PropostaEntrevista.updateOne({
                _id: item._id
            }, {
                lembrete: true
            })

            await Chat.create({
                de: TwilioNumber,
                para: whatsapp,
                mensagem
            })

            await client.messages.create({
                from: TwilioNumber,
                to: whatsapp,
                body: mensagem
            })
        }
    }
}

// Função para verificar se o tempo entre duas datas é de aproximadamente 10 minutos
function verificarTempoEntreDatas(date1, date2) {
    // Calcula a diferença em milissegundos entre as duas datas
    const diferencaEmMilissegundos = date2 - date1;

    const diferencaEmMinutos = diferencaEmMilissegundos / (1000 * 60);

    if (diferencaEmMinutos < 0) {
        return false
    }

    return diferencaEmMinutos < 10
}


module.exports = lembreteMensagem