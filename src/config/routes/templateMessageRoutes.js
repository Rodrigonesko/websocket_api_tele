const express = require('express')
const routes = express.Router()
const templateMessageController = require('../controllers/templateMessageController')
const auth = require('../middlewares/auth')

routes.post('/templateMessage', auth, templateMessageController)
routes.get('/templateMessage', auth, templateMessageController.index)
routes.put('/templateMessage/:id', auth, templateMessageController.update)
routes.delete('/templateMessage/:id', auth, templateMessageController.destroy)