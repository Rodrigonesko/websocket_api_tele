const Comentario = require('../models/Comentarios')
const moment = require('moment')

module.exports = {
    create: async (req, res) => {

        const { text, cpfTitular } = req.body

        const comentario = await Comentario.create({
            text,
            user: req.user,
            data: moment().format('DD/MM/YYYY HH:mm:ss'),
            cpfTitular
        })

        return res.json(comentario)
    },

    getComentarioPorCpf: async (req, res) => {

        console.log(req.params.cpf);

        const comentario = await Comentario.find({ cpfTitular: req.params.cpf })
        return res.json(comentario)
    },

    delete: async (req, res) => {
        const comentario = await Comentario.findByIdAndDelete(req.params.id)
        return res.json(comentario)
    }
}