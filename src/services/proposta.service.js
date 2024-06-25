const PropostaEntrvista = require('../models/PropostaEntrevista')

class PropostaService {
    constructor() { }

    async getPropostaByWhastapp(whatsapp) {
        return await PropostaEntrvista.findOne({ whatsapp });
    }
}

module.exports = new PropostaService();