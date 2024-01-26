const TemplateMessage = require('../models/templateMessage');

module.exports = {
    async index(req, res) {
        const templateMessages = await TemplateMessage.find({}).lean();
        return res.json(templateMessages);
    },

    async store(req, res) {
        const { name, contentSid, message } = req.body;

        const templateMessage = await TemplateMessage.create({
            name,
            contentSid,
            message
        });

        return res.json(templateMessage);
    },

    async update(req, res) {
        const { id } = req.params;
        const { name, contentSid, message } = req.body;

        const templateMessage = await TemplateMessage.findByIdAndUpdate(id, {
            name,
            contentSid,
            message
        }, { new: true });

        return res.json(templateMessage);
    },

    async destroy(req, res) {
        const { id } = req.params;

        await TemplateMessage.findByIdAndDelete(id);

        return res.send();
    }
}