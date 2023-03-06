const express = require('express')
const router = express.Router()

const publicController = require('../controllers/publicController')

router.get('/', publicController.index)
router.post('/login', publicController.login)
router.post('/logout', publicController.logout)

module.exports = router