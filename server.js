const express = require('express');
const path = require('path');
const axios = require('axios');
const db = require('./db/connection');
const app = express();
const PORT = 3000;
require('dotenv').config()

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
const ASAAS_API_KEY = '$aact_MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjI1MzgwZGNhLTM2MDItNDUzMi04ZDRkLTA4MWRmNDU0OTU2NTo6JGFhY2hfOTU5NTFmYTctYTZhZi00MTQ5LThiNjMtNDQ0Mjg0ZWE3OTFh'

// Endpoint para criar cliente
app.post('/criar-cliente', async (req, res) => {
    const clienteData = req.body;

    try {
        // Verificar se o email já existe na tabela users
        const checkEmailQuery = 'SELECT * FROM users WHERE email = ? LIMIT 1';
        const [userResult] = await db.query(checkEmailQuery, [clienteData.email]);

        let userId;

        // Se o email existir, atualiza o usuário com o customerId
        if (userResult.length > 0) {
            userId = userResult[0].id;
            console.log(`Usuário encontrado: ${userResult[0].email}, Atualizando...`);
            
            // Atualiza o customerId na tabela users
            const updateQuery = 'UPDATE users SET customerId = ? WHERE id = ?';
            await db.query(updateQuery, [clienteData.customerId, userId]);

        } else {
            // Se o email não existir, cria um novo usuário
            console.log(`Usuário não encontrado, criando novo usuário...`);
            
            const insertQuery = 'INSERT INTO users (nome, email, telefone, cpfCnpj, postalCode, customerId) VALUES (?, ?, ?, ?, ?, ?)';
            const [insertResult] = await db.query(insertQuery, [
                clienteData.nome,
                clienteData.email,
                clienteData.telefone,
                clienteData.cpf,
                clienteData.cep,
                clienteData.customerId, // customerId gerado do Asaas
            ]);
            
            userId = insertResult.insertId;
        }

        // Enviar dados para criar o cliente no Asaas
        console.log('Enviando dados para criar cliente no Asaas:', clienteData);
        const response = await axios.post('https://sandbox.asaas.com/api/v3/customers', {
            name: `${clienteData.nome} ${clienteData.sobrenome}`,
            cpfCnpj: clienteData.cpf,
            email: clienteData.email,
            phone: clienteData.telefone,
            postalCode: clienteData.cep,
        }, {
            headers: {
                'accept': 'application/json',
                'access_token': ASAAS_API_KEY, // Sua chave da API
                'content-type': 'application/json',
            }
        });

        console.log('Cliente criado com sucesso no Asaas:', JSON.stringify(response.data, null, 2));

        const customerId = response.data.id; // Pega o customerId da resposta do Asaas

        // Atualiza ou cria o customerId no banco de dados
        const customerQuery = 'UPDATE users SET customerId = ? WHERE id = ?';
        await db.query(customerQuery, [customerId, userId]);

        // Retorna a resposta para o cliente
        res.json({
            success: true,
            data: response.data,
            customerId: customerId,
        });

    } catch (error) {
        // Se houver um erro, retorna erro
        console.error('Erro ao criar cliente(back):', error.response ? error.response.data : error.message);
        console.log('Dados enviados para a API Asaas:', {
            name: `${clienteData.nome} ${clienteData.sobrenome}`,
            cpfCnpj: clienteData.cpf,
            email: clienteData.email,
            phone: clienteData.telefone,
            postalCode: clienteData.cep,
        });
        res.json({ success: false, error: 'Erro ao criar o cliente no Asaas' });
    }
});

// Rota para criar assinatura (cobrança recorrente) com pagamento via cartão de crédito
// Endpoint para criar assinatura (cobrança recorrente) com pagamento via cartão de crédito
app.post('/criar-assinatura', async (req, res) => {
    const { billingType, customerId, value, nextDueDate, cycle, description, cardDetails } = req.body;
    console.log(customerId)

    const asaasUrl = 'https://sandbox.asaas.com/api/v3/subscriptions';

    // Dados para a assinatura
    const subscriptionData = {
        billingType,          // Tipo de cobrança (CREDIT_CARD ou BOLETO)
        customer: customerId, // ID do cliente (retornado da criação do cliente)
        value,                // Valor da cobrança
        nextDueDate,          // Data da próxima cobrança
        cycle,                // Mensal ou outro ciclo
        description,          // Descrição da assinatura
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

    try {
        // Enviar a requisição para criar a assinatura
        console.log('Enviando dados para criar assinatura:', subscriptionData);
        const response = await axios.post(asaasUrl, subscriptionData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ASAAS_API_KEY}`
            }
        });

        console.log('Assinatura criada com sucesso:', response.data);

        // Salvar as informações no banco de dados (caso necessário)
        const query = 'INSERT INTO subscriptions (user_id, subscription_id, status) VALUES (?, ?, ?)';
        await db.query(query, [customerId, response.data.id, response.data.status]);

        res.status(200).json({ message: 'Assinatura criada com sucesso!', data: response.data });

    } catch (error) {
        console.error('Erro ao criar assinatura:', error.response ? error.response.data : error.message);
        res.status(500).json({
            success: false,
            message: 'Erro ao criar assinatura no Asaas',
            error: error.response?.data || error.message
        });
    }
});


// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
