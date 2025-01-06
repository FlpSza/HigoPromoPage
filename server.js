const express = require('express');
const path = require('path');
const axios = require('axios');
const db = require('./db/connection');
const app = express();
const session = require('express-session');  
const cors = require('cors');
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

app.use(cors({
    origin: 'https://higoviagens.com', // Permitir apenas esta origem
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota para testar conexão com o banco de dados
app.get('/test-connection', async (req, res) => {
    pool.connect((err) => {
        if (err) {
            console.error('Erro ao conectar ao banco de dados:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Erro ao conectar ao banco de dados.', 
                error: err.message 
            });
        }
        console.log('Conexão bem-sucedida ao banco de dados!');
        return res.status(200).json({ 
            success: true, 
            message: 'Conexão bem-sucedida ao banco de dados!' 
        });
    });
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

        // Armazenar os dados na sessão
        req.session.userData = {
            email: clienteData.email,
            cpfCnpj: clienteData.cpf,
            telefone: clienteData.telefone,
            postalCode: clienteData.cep,
            numeroCasa: clienteData.numeroCasa
        };

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
                'INSERT INTO users (username, email, phone, customerId) VALUES (?, ?, ?, ?, ?, ?)';
            const [insertResult] = await db.query(insertQuery, [
                clienteData.nome,
                clienteData.email,
                clienteData.telefone,
                // clienteData.cpf,
                // clienteData.cep,
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

app.get('/api/usuario-logado', (req, res) => {
    // Verifica se os dados do usuário estão na sessão
    if (req.session && req.session.userData) {
        res.json({
            success: true,
            usuario: req.session.userData, // Retorna os dados armazenados
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Nenhum usuário logado.',
        });
    }
});

      // Função para gerar pix

      const valorFixo = 5.0; // Exemplo de valor fixo em reais
      const descricaoFixa = "Assinatura Higo"; // Descrição fixa para a cobrança

      async function gerarPixInter(valorFixo, descricaoFixa) {
        const tokenUrl = "https://cdpj.partners.bancointer.com.br/oauth/v2/token";
        const pixUrl = "https://cdpj.partners.bancointer.com.br/pix/charge";

        try {
          // Obtenha o token de acesso
          const tokenResponse = await fetch(tokenUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: "c1e2aa0c-5d90-4b20-a7cb-73384a2ae52c",
              client_secret: "539d9c5d-e7d2-4de6-9d8b-9ad0a14c3da9",
            }),
          });
          const tokenData = await tokenResponse.json();
          const accessToken = tokenData.access_token;

          // Gere a cobrança do PIX
          const pixResponse = await fetch(pixUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              valor: valorFixo.toFixed(2),
              descricao: descricaoFixa,
              pagador: {
                cpfCnpj: usuario.cpfCnpj,
                nome: usuario.nome,
              },
            }),
          });
          const pixData = await pixResponse.json();

          if (pixData.qrCode) {
            // Exibir o QR Code ao usuário
            document.getElementById("pixQrCode").src = pixData.qrCode;
            document.getElementById("pixSection").style.display = "block";
          } else {
            alert("Erro ao gerar o PIX.");
          }
        } catch (error) {
          console.error("Erro na integração com o Banco Inter:", error);
          alert("Erro ao processar o PIX.");
        }
      }

// Rota para criar assinatura (cobrança recorrente) com pagamento via cartão de crédito
app.post('/criar-assinatura', async (req, res) => {
    // Recuperar os dados da sessão
    const userData = req.session.userData;

    if (!userData) {
        return res.status(400).json({ success: false, message: 'Dados do usuário não encontrados na sessão.' });
    }

    const { email, cpfCnpj, telefone, postalCode, numeroCasa } = userData;

    console.log('Dados do usuário recuperados da sessão:', { email, cpfCnpj, telefone, postalCode, numeroCasa });

    try {
        // Detalhes do cartão enviados na requisição
        const { cardDetails } = req.body;

        if (!cardDetails || !cardDetails.cardHolder || !cardDetails.cardNumber || !cardDetails.expirationMonth || !cardDetails.expirationYear || !cardDetails.cvv) {
            return res.status(400).json({ success: false, message: 'Detalhes do cartão incompletos ou inválidos.' });
        }

        console.log('Detalhes do cartão:', cardDetails);

        // Garantir que o mês de expiração tenha dois dígitos
        const expirationMonth = cardDetails.expirationMonth ? cardDetails.expirationMonth.padStart(2, '0') : '';
        const expirationYear = cardDetails.expirationYear || '';
        const cvv = cardDetails.cvv || '';

        // Query para buscar o customerId do usuário pelo email
        const usuarioQuery = 'SELECT customerId FROM users WHERE email = ? LIMIT 1;';
        const [usuarioResult] = await db.query(usuarioQuery, [email]);

        if (usuarioResult.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
        }

        const customerId = usuarioResult[0].customerId;
        console.log('customerId encontrado no banco de dados:', customerId);

        // Estrutura para a requisição de tokenização
        const tokenBody = {
            creditCard: {
                holderName: cardDetails.cardHolder,
                number: cardDetails.cardNumber,
                expiryMonth: expirationMonth,
                expiryYear: expirationYear,
                ccv: cvv
            },
            creditCardHolderInfo: {
                name: cardDetails.cardHolder,
                email: email,
                cpfCnpj: cpfCnpj,
                postalCode: postalCode,
                addressNumber: cardDetails.numeroCasa || 'S/N',
                phone: telefone,
                mobilePhone: telefone,
                addressComplement: cardDetails.addressComplement || ''
            },
            customer: customerId, // Agora estamos usando o customerId da tabela users
            remoteIp: req.ip
        };

        // Opções para a requisição da tokenização
        const tokenOptions = {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                access_token: ASAAS_API_KEY  // Substitua com seu token de acesso correto
            },
            body: JSON.stringify(tokenBody)
        };

        // Realizar a requisição para a API Asaas
        const tokenResponse = await fetch('https://sandbox.asaas.com/api/v3/creditCard/tokenizeCreditCard', tokenOptions);

        // Captura a resposta da API como texto
        const responseText = await tokenResponse.text();
        console.log('Resposta da API:', responseText);

        // Verificar se a resposta foi bem-sucedida (status 2xx)
        if (!tokenResponse.ok) {
            console.error(`Erro na resposta: ${tokenResponse.status} - ${tokenResponse.statusText}`);
            return res.status(tokenResponse.status).json({
                success: false,
                message: 'Erro ao tokenizar cartão.',
                error: responseText
            });
        }

        // Tenta fazer o parse da resposta em JSON
        let tokenData;
        try {
            tokenData = JSON.parse(responseText);
        } catch (jsonParseError) {
            console.error('Erro ao parsear resposta JSON:', jsonParseError);
            return res.status(500).json({
                success: false,
                message: 'Erro ao processar a resposta da API. A resposta não é um JSON válido.',
                error: jsonParseError.message
            });
        }

        console.log('Token de cartão de crédito criado:', tokenData);

        // Resposta de sucesso
        res.json({
            success: true,
            message: 'Assinatura criada com sucesso.',
            tokenData: tokenData
        });

    } catch (err) {
        // Captura erros inesperados e envia resposta de erro
        console.error('Erro inesperado:', err);
        res.status(500).json({
            success: false,
            message: 'Erro ao buscar informações do cliente ou tokenizar cartão.',
            error: err.message
        });
    }
});




// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em: https://higopromopage.onrender.com/${PORT}`);
});
