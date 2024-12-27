const express = require('express');
const path = require('path');
const db = require('./db/connection'); // Supondo que você tenha uma conexão com o banco de dados configurada
const app = express();
const PORT = 3000;

// Middleware para permitir o envio de dados JSON
app.use(express.json());

// Servir os arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Testar a conexão com o banco de dados
app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS result');
        res.send(`Resultado da consulta: ${rows[0].result}`);
    } catch (err) {
        console.error('Erro ao testar a conexão:', err);
        res.status(500).send('Erro ao conectar ao banco de dados.');
    }
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para processar o registro de usuário
app.post('/register', (req, res) => {
    const { username, email, phone, password } = req.body;

    // Validar os dados do usuário
    if (!username || !email || !phone || !password) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    // Lógica de salvamento no banco de dados (simulação)
    const query = 'INSERT INTO users (username, email, phone, password) VALUES (?, ?, ?, ?)';
    db.query(query, [username, email, phone, password], (err, result) => {
        if (err) {
            console.error('Erro ao salvar o usuário:', err);
            return res.status(500).json({ message: 'Erro ao salvar o usuário no banco de dados.' });
        }

        // Retorna uma resposta de sucesso
        return res.status(200).json({ message: 'Usuário cadastrado com sucesso!' });
    });

    console.log('Novo usuário cadastrado:', { username, email, phone, password });

    // Retorna uma resposta de sucesso
    return res.status(200).json({ message: 'Usuário cadastrado com sucesso!' });
});

// Rota para processar o login de usuário
app.post('/login', async (req, res) => {
    const { username, pass } = req.body;

    // Verificar se o nome de usuário e senha foram informados
    if (!username || !pass) {
        return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
    }

    try {
        // Buscar o usuário no banco de dados pelo nome de usuário
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Usuário não encontrado.' });
        }

        const user = rows[0];

        // Comparar a senha fornecida com a senha armazenada (sem hashing)
        if (user.password !== pass) {
            return res.status(401).json({ message: 'Senha incorreta.' });
        }

        // Se a senha for correta, você pode criar uma sessão ou token aqui
        // Exemplo de resposta de sucesso
        res.status(200).json({ message: 'Login bem-sucedido!' });

    } catch (error) {
        console.error('Erro ao processar login:', error);
        res.status(500).json({ message: 'Erro ao realizar login.' });
    }
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em: http://localhost:${PORT}`);
});