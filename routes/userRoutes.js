const express = require('express');
const router = express.Router();
const { createUser } = require('../controllers/userController');

// Rota para cadastro de usuário
router.post('/register', createUser);

module.exports = router;
