const express = require('express')
const router = express.Router()

const publicController = require('../controllers/publicController')
const userController = require('../controllers/UserController')
const propostaController = require('../controllers/propostaController')
const auth = require('../middlewares/auth')

router.get('/', publicController.index)
router.post('/login', publicController.login)
router.post('/logout', publicController.logout)

router.get('/user', auth, userController.index)

router.post('/upload', auth, propostaController.upload)
router.get('/show', auth, propostaController.show)

module.exports = router