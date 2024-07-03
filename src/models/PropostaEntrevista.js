const mongoose = require('mongoose')

const propostaScheema = new mongoose.Schema({
    dataRecebimento: String,
    proposta: String,
    administradora: String,
    divergencia: String,
    status: String,
    newStatus: String,
    situacao: String,
    horario: String,
    vigencia: String,
    idade: Number,
    cpf: String,
    nome: String,
    sexo: String,
    dataNascimento: String,
    telefone: String,
    d1: String,
    d2: String,
    d3: String,
    d4: String,
    d5: String,
    d6: String,
    d7: String,
    d8: String,
    d9: String,
    observacao: String,
    agendado: String,
    statusAgendado: String,
    cid: String,
    filial: String,
    riscoBeneficiario: String,
    riscoImc: String,
    sinistral: String,
    liminar: String,
    fraude: String,
    propCancel: String,
    sinistContr: String,
    corretor: String,
    corretora: String,
    enfermeiro: String,
    dataEntrevista: String,
    grupoCarencia: String,
    peso: String,
    altura: String,
    imc: String,
    cid1: String,
    cid1: String,
    cid1: String,
    tipoAssociado: String,
    tipoContrato: String,
    formulario: String,
    anexadoSisAmil: String,
    cids: String,
    houveDivergencia: String,
    quemAnexou: String,
    quemAgendou: String,
    dataConclusao: String,
    contato1: String,
    responsavelContato1: String,
    tipoContato1: String,
    contato2: String,
    responsavelContato2: String,
    tipoContato2: String,
    contato3: String,
    responsavelContato3: String,
    tipoContrato3: String,
    cpfTitular: String,
    ddd: String,
    celular: String,
    whatsapp: String,
    celularCompleto: String,
    modelo: String,
    janelaHorario: String,
    perguntaAtendimentoHumanizado: Boolean,
    atendimentoHumanizado: Boolean,
    atendimentoEncerrado: Boolean,
    horarioEnviado: String,
    opcaoDia1: String,
    opcaoDia2: String,
    naoEnviar: Boolean,
    horarioRespondido: String,
    responsavelConversa: String,
    visualizado: Boolean,
    lembrete: Boolean,
    enviadoTwilio: Boolean,
    reenviadoVigencia: Boolean,
    nomeOperadora: String,
    retrocedido: String,
    wppSender: String,
    whatsappsAnteriores: [],
    canal: String,
    statusWhatsapp: String,
    diasEnviados: [''],
    diaEscolhido: String,
    horariosEnviados: [''],
    horarioEscolhido: String,
    quemAjustou: String,
<<<<<<< HEAD
    vigenciaAmil: String,
=======
    dadosEntrevista: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DadosEntrevista'
    },
    responsavel: String,
    dataVigenciaAmil: String,
>>>>>>> d7d3bffb0006940192b4093368d4bca1bf3bff84
}, {
    timestamps: true
})

propostaScheema.index({ agendado: 1, status: 1 })

module.exports = mongoose.model('PropostaEntrevista', propostaScheema)