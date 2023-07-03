const mongoose = require('mongoose')

const propostaScheema = mongoose.Schema({
    dataRecebimento: String,
    proposta: String,
    administradora: String,
    divergencia: String,
    status: String,
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
    contato2: String,
    responsavelContato2: String,
    contato3: String,
    responsavelContato3: String,
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
    retrocedido: String
}, {
    timestamps: true
})

module.exports = mongoose.model('PropostaEntrevista', propostaScheema)