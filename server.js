const express = require('express');
const path = require('path');
const axios = require('axios');
const db = require('./db/connection');
const app = express();
const session = require('express-session');  
// const fetch = require('node-fetch');
const PORT = 3000;
require('dotenv').config()

// Middleware para permitir o envio de dados JSON
app.use(express.json());

// Servir os arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Configuração do express-session
app.use(session({
    secret: 'segredo',  // Substitua por uma chave secreta segura
    resave: false,               // Não regrava a sessão se não houver alterações
    saveUninitialized: true,     // Salva sessões mesmo sem dados
    cookie: { secure: false }    // Se estiver usando HTTPS, altere para true
}));

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

        // Se a senha for correta, crie uma sessão e armazene o email do usuário nela
        req.session.email = user.email;
        const email = req.session.email;
        // console.log(email)

        // Resposta de login bem-sucedido
        res.status(200).json({ message: 'Login bem-sucedido!', email: user.email });

    } catch (error) {
        console.error('Erro ao processar login:', error);
        res.status(500).json({ message: 'Erro ao realizar login.' });
    }
});

// Configuração da chave da API do Asaas
const ASAAS_API_KEY = '$aact_MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjUyOWZkNGYwLTE5Y2YtNGY5NC1iMmJhLTk3MTFiYzA0OTdjYTo6JGFhY2hfMTQ5ZjcxMjAtODUxYi00NGVlLTk4MDQtZmUzYTg1MzU0Y2Qw'

// Endpoint para criar cliente
app.post('/criar-cliente', async (req, res) => {
    const clienteData = req.body;

    try {
        // Enviar dados para criar o cliente no Asaas
        console.log('Enviando dados para criar cliente no Asaas:', clienteData);

        const response = await axios.post(
            'https://sandbox.asaas.com/api/v3/customers',
            {
                name: `${clienteData.nome} ${clienteData.sobrenome}`,
                cpfCnpj: clienteData.cpf,
                email: clienteData.email,
                phone: clienteData.telefone.replace(/\D/g, ''), // Remove caracteres não numéricos
                postalCode: clienteData.cep.replace(/\D/g, ''), // Remove caracteres não numéricos
            },
            {
                headers: {
                    'accept': 'application/json',
                    'access_token': ASAAS_API_KEY, // Sua chave da API
                    'content-type': 'application/json',
                },
            }
        );

        const customerId = response.data.id; // Pega o customerId da resposta do Asaas
        console.log('Cliente criado com sucesso no Asaas:', customerId);

        // Verificar se o email já existe na tabela users
        const checkEmailQuery = 'SELECT id FROM users WHERE email = ? LIMIT 1';
        const [userResult] = await db.query(checkEmailQuery, [clienteData.email]);

        if (userResult.length > 0) {
            // Atualizar o customerId do usuário existente
            const updateQuery = 'UPDATE users SET customerId = ? WHERE id = ?';
            await db.query(updateQuery, [customerId, userResult[0].id]);
            console.log(`Usuário atualizado com customerId: ${customerId}`);
        } else {
            // Criar novo usuário com o customerId
            const insertQuery =
                'INSERT INTO users (nome, email, telefone, cpfCnpj, postalCode, customerId) VALUES (?, ?, ?, ?, ?, ?)';
            const [insertResult] = await db.query(insertQuery, [
                clienteData.nome,
                clienteData.email,
                clienteData.telefone,
                clienteData.cpf,
                clienteData.cep,
                customerId,
            ]);
            console.log(`Novo usuário criado com ID: ${insertResult.insertId}`);
        }

        // Resposta de sucesso
        res.json({
            success: true,
            message: 'Cliente criado e sincronizado com sucesso.',
            customerId: customerId,
        });
    } catch (error) {
        console.error('Erro ao criar cliente:', error.response ? error.response.data : error.message);

        // Log dos dados enviados (para depuração)
        console.log('Dados enviados para a API Asaas:', {
            name: `${clienteData.nome} ${clienteData.sobrenome}`,
            cpfCnpj: clienteData.cpf,
            email: clienteData.email,
            phone: clienteData.telefone,
            postalCode: clienteData.cep,
        });

        res.status(500).json({
            success: false,
            error: 'Erro ao criar o cliente no Asaas ou sincronizar no banco.',
        });
    }
});


// Rota para criar assinatura (cobrança recorrente) com pagamento via cartão de crédito
app.post('/criar-assinatura', async (req, res) => {
    const email = req.session.email; // Email da sessão
    const { billingType, value, nextDueDate, cycle, description, cardDetails } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email não encontrado na sessão' });
    }

    console.log('Email do cliente:', email);

    try {
        // Buscar o customerId no banco de dados com base no email
        const query = 'SELECT customerId FROM users WHERE email = ? LIMIT 1';
        const [result] = await db.query(query, [email]);

        if (result.length === 0 || !result[0].customerId) {
            return res.status(404).json({ success: false, message: 'Cliente não encontrado ou customerId ausente no banco de dados' });
        }

        const customerId = result[0].customerId;
        console.log('Customer ID encontrado no banco de dados:', customerId);

        // Montar o corpo da requisição para o Asaas
        const url = 'https://sandbox.asaas.com/api/v3/subscriptions';
        const body = {
            billingType: billingType || 'CREDIT_CARD',
            customer: customerId, // Usar o customerId buscado no banco
            value,
            nextDueDate,
            cycle: cycle || 'MONTHLY',
            description,
            ...(billingType === 'CREDIT_CARD' && {
                creditCard: {
                    holderName: cardDetails.cardHolder,
                    number: cardDetails.cardNumber,
                    expirationMonth: cardDetails.expirationMonth,
                    expirationYear: cardDetails.expirationYear,
                    cvv: cardDetails.cvv
                }
            })
        };

        // Log detalhado do payload enviado
        console.log('Payload enviado para o Asaas:', JSON.stringify(body, null, 2));

        const options = {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                access_token: ASAAS_API_KEY // Substitua pelo seu token do Asaas
            },
            body: JSON.stringify(body)
        };

        // Enviar requisição para o Asaas
        const response = await fetch(url, options);

        if (!response.ok) {
            const error = await response.json();
            console.error('Erro ao criar assinatura:', error);
            return res.status(response.status).json({ success: false, message: 'Erro ao criar assinatura.', error });
        }

        const data = await response.json();
        console.log('Assinatura criada com sucesso:', data);

        // Retornar sucesso
        res.json({ success: true, message: 'Assinatura criada com sucesso!', data });
    } catch (err) {
        console.error('Erro inesperado:', err);
        res.status(500).json({ success: false, message: 'Erro ao criar assinatura.', error: err.message });
    }
});



// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
