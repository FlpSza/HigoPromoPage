const express = require('express');
const path = require('path');
const axios = require('axios');
const db = require('./db/connection');
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

// Configuração da chave da API do Asaas
const ASAAS_API_KEY = '$aact_MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjJiNWVmMTk5LWRmNTYtNGRiMy05MjY2LWI3NTUyOWZjY2YzOTo6JGFhY2hfMjJhNzI1M2MtMTVlOC00NTE1LWEyNjYtMDRlNzRjNjRhNzBm'; // Substitua pela sua chave da API do Asaas

// Endpoint para criar cliente
app.post('/criar-cliente', async (req, res) => {
    const clienteData = req.body;

    try {
        // Enviar dados para o Asaas
        const response = await axios.post('https://sandbox.asaas.com/api/v3/customers', {
            name: `${clienteData.nome} ${clienteData.sobrenome}`,
            cpfCnpj: clienteData.cpf,
            email: clienteData.email,
            phone: clienteData.telefone,
            postalCode: clienteData.cep,
        }, {
            headers: {
                'accept': 'application/json',
                'access_token': '$aact_MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjJiNWVmMTk5LWRmNTYtNGRiMy05MjY2LWI3NTUyOWZjY2YzOTo6JGFhY2hfMjJhNzI1M2MtMTVlOC00NTE1LWEyNjYtMDRlNzRjNjRhNzBm', // Sua chave da API
                'content-type': 'application/json',
            }
        });

        // Exibir a resposta JSON no console
        console.log('Cliente criado com sucesso:', JSON.stringify(response.data, null, 2));

        // Resposta com sucesso
        res.json({ success: true, data: response.data });
    } catch (error) {
        // Se houver um erro na criação do cliente, retorna erro
        console.error('Erro ao criar cliente:', error.response ? error.response.data : error.message);
        res.json({ success: false, error: 'Erro ao criar o cliente no Asaas' });
    }
});

// Rota para processar o pagamento
app.post('/finalizar-pagamento', async (req, res) => {
    const { userId, paymentMethod, cardDetails } = req.body;

    try {
        // Verifique se os dados de pagamento foram enviados
        if (!userId || !paymentMethod) {
            return res.status(400).json({ message: 'Dados incompletos.' });
        }

        // Crie a cobrança no Asaas
        const paymentData = {
            customer: userId,  // ID do usuário
            value: 0.10, // Valor da assinatura (10 centavos)
            dueDate: '2024-12-31',  // Data de vencimento
            paymentMethod,  // Método de pagamento (Cartão de Crédito, Boleto, etc.)
            cycle: "monthly",  // Definindo a cobrança como mensal
            nextDueDate: '2025-01-31', // Data de vencimento da próxima cobrança
            ...(paymentMethod === 'credit_card' && {
                creditCard: {
                    holderName: cardDetails.cardHolder,
                    number: cardDetails.cardNumber,
                    expirationMonth: cardDetails.expirationMonth,
                    expirationYear: cardDetails.expirationYear,
                    cvv: cardDetails.cvv
                }
            })
        };

        // Enviar a solicitação para criar o pagamento no Asaas
        const response = await axios.post('https://www.asaas.com/api/v3/payments', paymentData, {
            headers: {
                'Authorization': `Bearer ${ASAAS_API_KEY}`
            }
        });

        const paymentInfo = response.data;

        // Salve as informações no banco de dados
        const query = 'INSERT INTO subscriptions (user_id, payment_id, status) VALUES (?, ?, ?)';
        await db.query(query, [userId, paymentInfo.id, paymentInfo.status]);

        res.status(200).json({ message: 'Pagamento realizado com sucesso!', paymentInfo });
    } catch (error) {
        console.error('Erro ao realizar pagamento:', error);
        res.status(500).json({ message: 'Erro ao processar pagamento.', error: error.message });
    }
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em: http://localhost:${PORT}`);
});