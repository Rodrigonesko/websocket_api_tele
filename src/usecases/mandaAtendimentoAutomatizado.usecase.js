const Chat = require('../models/Chat');
const Proposta = require('../models/PropostaEntrevista');
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const MESSAGING_SERVICE_SID = process.env.MESSAGING_SERVICE_SID;
const client = require('twilio')(ACCOUNT_SID, AUTH_TOKEN);
const moment = require('moment');

const CONTENT_TEMPLATE_SID = 'HXaefa3495a5af5e72491eaaea5dda9be9'

class MandaAtendimentoAutomatizado {
    constructor() { }

    async exec(id) {
        try {

            console.log('id', id);

            const proposta = await Proposta.findById(id, { whatsapp: 1, nome: 1, wppSender: 1, cpfTitular: 1 })

            const { whatsapp, nome, wppSender, cpfTitular } = proposta;

            if (!whatsapp || whatsapp.length !== 23) {
                return { msg: 'whatsapp não encontrado' }
            }

            const msg = `Prezado Sr. (a) ${nome},
Somos da Área de Implantação da Amil e para concluirmos a contratação do Plano de Saúde do Sr.(a), e dos seus dependentes (caso tenha) precisamos confirmar alguns dados médicos.
Por gentileza, poderia responder essa mensagem para podermos seguir com o atendimento?`

            console.log();

            const mensagemTwilio = await client.messages.create({
                from: wppSender,
                to: whatsapp,
                contentSid: CONTENT_TEMPLATE_SID,
                messagingServiceSid: MESSAGING_SERVICE_SID,
                contentVariables: JSON.stringify({
                    '1': nome
                })
            })

            let statusMessage = await client.messages(mensagemTwilio.sid).fetch()

            for (let index = 0; index < 3; index++) {
                statusMessage = await client.messages(mensagemTwilio.sid).fetch()
            }

            console.log('statusMessage', statusMessage);

            if (statusMessage.errorCode) {
                await Proposta.updateMany({
                    cpfTitular,
                    status: { $nin: ['Cancelado', 'Concluído'] }
                }, {
                    newStatus: 'Sem whatsapp',
                    situacao: 'Sem whatsapp',
                })
                return { msg: 'Erro ao enviar mensagem' }
            }


            await Chat.create({
                de: wppSender,
                para: whatsapp,
                mensagem: msg,
                horario: moment().format('YYYY-MM-DD HH:mm:ss'),
                lida: false,
                status: statusMessage.status,
                sid: mensagemTwilio.sid,
                quemEnviou: 'Sistema',
                arquivo: null,
                errorCode: statusMessage.errorCode
            })

            await Proposta.updateOne({
                _id: id
            }, {
                statusWhatsapp: 'Saudacao enviada',
                situacao: 'Enviada',
                wppSender,
                horarioEnviado: moment().format('YYYY-MM-DD HH:mm'),
                responsavelContato1: 'Bot Whatsapp',
                contato1: moment().format('YYYY-MM-DD HH:mm')
            })

            await Proposta.updateMany({
                cpfTitular,
                whatsapp: 'whatsapp:+55'
            }, {
                newStatus: 'Saudacao enviada',
                situacao: 'Enviada',
                wppSender,
                horarioEnviado: moment().format('YYYY-MM-DD HH:mm'),
                responsavelContato1: 'Bot Whatsapp',
                contato1: moment().format('YYYY-MM-DD HH:mm')
            })

            return { msg: 'Mensagem enviada com sucesso' }

        } catch (error) {
            console.log('error', error);
            throw new Error('Erro ao enviar atendimento automatizado');
        }
    }
}

module.exports = new MandaAtendimentoAutomatizado();