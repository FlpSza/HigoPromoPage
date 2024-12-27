const db = require('../db/connection'); // Conexão com o banco de dados

// Função para criar um novo usuário
const createUser = async (req, res) => {
    const { username, email, phone, password_hash } = req.body;

    if (!username || !email || !password_hash) {
        return res.status(400).send('Preencha todos os campos obrigatórios');
    }

    try {
        const query = 'INSERT INTO users (username, email, phone, password_hash) VALUES (?, ?, ?, ?)';
        await db.query(query, [username, email, phone, password_hash]);
        res.status(201).send('Usuário cadastrado com sucesso!');
    } catch (err) {
        console.error('Erro ao criar usuário:', err);
        res.status(500).send('Erro ao cadastrar o usuário');
    }
};

module.exports = { createUser };
