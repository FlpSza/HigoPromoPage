const express = require("express");
const path = require("path");
const axios = require("axios");
const db = require("./db/connection");
const app = express();
const session = require("express-session");
const cors = require("cors");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const cron = require('node-cron');
const fs = require('fs');
// const fetch = require('node-fetch');
const PORT = 3000;
require("dotenv").config();

// Middleware para permitir o envio de dados JSON
app.use(express.json());

// Servir os arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Configuração do express-session
app.use(
  session({
    secret: "segredo", // Substitua por uma chave secreta segura
    resave: false, // Não regrava a sessão se não houver alterações
    saveUninitialized: true, // Salva sessões mesmo sem dados
    cookie: { secure: false }, // Se estiver usando HTTPS, altere para true
  })
);

app.use(
  cors({
    origin: "https://higoviagens.com", // Permitir apenas esta origem
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Configuração da API (substitua pelas suas credenciais)
const PIX_API_URL = "https://cdpj.partners.bancointer.com.br/oauth/v2/token"; // Substitua pelo endpoint correto
const CLIENT_ID = "3fea13df-1e68-447c-b306-a87d7c058024"; // Armazene o client_id no .env
const CLIENT_SECRET = "79f8d856-bb83-4ada-a5d0-01b22cfe43c1"; // Armazene o client_secret no .env
const CERT_PATH = './certificados/Inter API_Certificado.crt';
const KEY_PATH = './certificados/Inter API_Chave.key';
// Caminhos para os arquivos de certificado e chave privada
const certPath = path.resolve(__dirname, 'certificados/Inter API_Certificado.crt');
const keyPath = path.resolve(__dirname, 'certificados/Inter API_Chave.key');

// Rota principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Rota para testar conexão com o banco de dados
app.get("/test-connection", async (req, res) => {
  pool.connect((err) => {
    if (err) {
      console.error("Erro ao conectar ao banco de dados:", err);
      return res.status(500).json({
        success: false,
        message: "Erro ao conectar ao banco de dados.",
        error: err.message,
      });
    }
    console.log("Conexão bem-sucedida ao banco de dados!");
    return res.status(200).json({
      success: true,
      message: "Conexão bem-sucedida ao banco de dados!",
    });
  });
});

// Rota para processar o registro de usuário
app.post("/register", (req, res) => {
  const { username, email, phone, password } = req.body;

  // Validar os dados do usuário
  if (!username || !email || !phone || !password) {
    return res
      .status(400)
      .json({ message: "Todos os campos são obrigatórios." });
  }

  // Lógica de salvamento no banco de dados (simulação)
  const query =
    "INSERT INTO users (username, email, phone, password) VALUES (?, ?, ?, ?)";
  db.query(query, [username, email, phone, password], (err, result) => {
    if (err) {
      console.error("Erro ao salvar o usuário:", err);
      return res
        .status(500)
        .json({ message: "Erro ao salvar o usuário no banco de dados." });
    }

    // Retorna uma resposta de sucesso
    return res.status(200).json({ message: "Usuário cadastrado com sucesso!" });
  });

  console.log("Novo usuário cadastrado:", { username, email, phone, password });

  // Retorna uma resposta de sucesso
  return res.status(200).json({ message: "Usuário cadastrado com sucesso!" });
});

// Rota para processar o login de usuário
app.post("/login", async (req, res) => {
  const { username, pass } = req.body;

  // Verificar se o nome de usuário e senha foram informados
  if (!username || !pass) {
    return res
      .status(400)
      .json({ message: "Nome de usuário e senha são obrigatórios." });
  }

  try {
    // Buscar o usuário no banco de dados pelo nome de usuário
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Usuário não encontrado." });
    }

    const user = rows[0];

    // Comparar a senha fornecida com a senha armazenada (sem hashing)
    if (user.password !== pass) {
      return res.status(401).json({ message: "Senha incorreta." });
    }

    // Resposta de login bem-sucedido
    res.status(200).json({ message: "Login bem-sucedido!", email: user.email });
  } catch (error) {
    console.error("Erro ao processar login:", error);
    res.status(500).json({ message: "Erro ao realizar login." });
  }
});

// Configuração da chave da API do Asaas
// const ASAAS_API_KEY =
//   "$aact_MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjUyOWZkNGYwLTE5Y2YtNGY5NC1iMmJhLTk3MTFiYzA0OTdjYTo6JGFhY2hfMTQ5ZjcxMjAtODUxYi00NGVlLTk4MDQtZmUzYTg1MzU0Y2Qw";
const ASAAS_API_KEY = "$aact_MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjQ0YWY1ZjBiLTQ3YTUtNDI1NS04NDI4LTgyMmRjMTkzZGY2ZDo6JGFhY2hfYTRlZjI3ZDEtNTM4NC00MzIxLWEyMjgtNTUwMmU4MGM2YmQz";

// Endpoint para criar cliente
app.post("/criar-cliente", async (req, res) => {
  const clienteData = req.body;

  try {
    // Enviar dados para criar o cliente no Asaas
    console.log("Enviando dados para criar cliente no Asaas:", clienteData);

    const response = await axios.post(
      "https://www.asaas.com/api/v3/customers",
      {
        name: `${clienteData.nome} ${clienteData.sobrenome}`,
        cpfCnpj: clienteData.cpf,
        email: clienteData.email,
        phone: clienteData.telefone.replace(/\D/g, ""), // Remove caracteres não numéricos
        postalCode: clienteData.cep.replace(/\D/g, ""), // Remove caracteres não numéricos
      },
      {
        headers: {
          accept: "application/json",
          access_token: ASAAS_API_KEY, // Sua chave da API
          "content-type": "application/json",
        },
      }
    );

    const customerId = response.data.id; // Pega o customerId da resposta do Asaas
    console.log("Cliente criado com sucesso no Asaas:", customerId);

    // Armazenar os dados na sessão
    req.session.userData = {
      email: clienteData.email,
      cpfCnpj: clienteData.cpf,
      telefone: clienteData.telefone,
      postalCode: clienteData.cep,
      numeroCasa: clienteData.numeroCasa,
    };

    // Verificar se o email já existe na tabela users
    const checkEmailQuery = "SELECT id FROM users WHERE email = ? LIMIT 1";
    const [userResult] = await db.query(checkEmailQuery, [clienteData.email]);

    if (userResult.length > 0) {
      // Atualizar o customerId do usuário existente
      const updateQuery = "UPDATE users SET customerId = ? WHERE id = ?";
      await db.query(updateQuery, [customerId, userResult[0].id]);
      console.log(`Usuário atualizado com customerId: ${customerId}`);
    } else {
      const genericPassword = crypto.randomBytes(4).toString("hex"); // Gerar senha genérica
      const hashedPassword = crypto
        .createHash("sha256")
        .update(genericPassword)
        .digest("hex"); // Opcional: Hash da senha

      // Criar novo usuário com o customerId
      const insertQuery =
        "INSERT INTO users (username, email, phone, customerId, password) VALUES (?, ?, ?, ?, ?)";
      const [insertResult] = await db.query(insertQuery, [
        clienteData.nome,
        clienteData.email,
        clienteData.telefone,
        // clienteData.cpf,
        // clienteData.cep,
        customerId,
        hashedPassword,
      ]);
      console.log(`Novo usuário criado com ID: ${insertResult.insertId}`);

      // Configurar o transporte de email
      const transporter = nodemailer.createTransport({
        host: 'smtp.hostinger.com', // Servidor SMTP da Hostinger
        port: 465, // Porta para SSL
        secure: true, // Utiliza SSL
        auth: {
          user: 'confirmacao@higoviagens.com', // Seu email
          pass: "Confirmacao25.", // Use senha do app (não senha normal)
        },
      });

      // Configurar e enviar o email
      const mailOptions = {
        from: "confirmacao@higoviagens.com",
        to: clienteData.email,
        subject: "Bem-vindo à nossa plataforma!",
        text: `Olá ${clienteData.nome},\n\nSeu usuário foi criado com sucesso!\n\nSenha de acesso: ${genericPassword}\n\nPor favor, altere sua senha após o primeiro login.\n\nAtenciosamente,\nEquipe.`,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log("Email enviado com sucesso para:", clienteData.email);
      } catch (emailError) {
        console.error("Erro ao enviar o email:", emailError.message);
        console.log("Detalhes do email não enviado:", mailOptions);
      }
    }

    // Resposta de sucesso
    res.json({
      success: true,
      message: "Cliente criado e sincronizado com sucesso.",
      customerId: customerId,
    });
  } catch (error) {
    console.error(
      "Erro ao criar cliente:",
      error.response ? error.response.data : error.message
    );

    // Log dos dados enviados (para depuração)
    console.log("Dados enviados para a API Asaas:", {
      name: `${clienteData.nome} ${clienteData.sobrenome}`,
      cpfCnpj: clienteData.cpf,
      email: clienteData.email,
      phone: clienteData.telefone,
      postalCode: clienteData.cep,
    });

    res.status(500).json({
      success: false,
      error: "Erro ao criar o cliente no Asaas ou sincronizar no banco.",
    });
  }
});

app.get("/api/usuario-logado", (req, res) => {
  // Verifica se os dados do usuário estão na sessão
  if (req.session && req.session.userData) {
    res.json({
      success: true,
      usuario: req.session.userData, // Retorna os dados armazenados
    });
  } else {
    res.status(401).json({
      success: false,
      message: "Nenhum usuário logado.",
    });
  }
});

// Função para gerar pix

const valorFixo = 5.0; // Exemplo de valor fixo em reais
const descricaoFixa = "Assinatura Higo"; // Descrição fixa para a cobrança


// Rota para criar assinatura (cobrança recorrente) com pagamento via cartão de crédito
app.post("/criar-assinatura", async (req, res) => {
  // Recuperar os dados da sessão
  const userData = req.session.userData;

  if (!userData) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Dados do usuário não encontrados na sessão.",
      });
  }

  const { email, cpfCnpj, telefone, postalCode, numeroCasa } = userData;

  console.log("Dados do usuário recuperados da sessão:", {
    email,
    cpfCnpj,
    telefone,
    postalCode,
    numeroCasa,
  });

  try {
    // Detalhes do cartão enviados na requisição
    const { cardDetails } = req.body;

    if (
      !cardDetails ||
      !cardDetails.cardHolder ||
      !cardDetails.cardNumber ||
      !cardDetails.expirationMonth ||
      !cardDetails.expirationYear ||
      !cardDetails.cvv
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Detalhes do cartão incompletos ou inválidos.",
        });
    }

    console.log("Detalhes do cartão:", cardDetails);

    // Garantir que o mês de expiração tenha dois dígitos
    const expirationMonth = cardDetails.expirationMonth
      ? cardDetails.expirationMonth.padStart(2, "0")
      : "";
    const expirationYear = cardDetails.expirationYear || "";
    const cvv = cardDetails.cvv || "";

    // Query para buscar o customerId do usuário pelo email
    const usuarioQuery =
      "SELECT customerId FROM users WHERE email = ? LIMIT 1;";
    const [usuarioResult] = await db.query(usuarioQuery, [email]);

    if (usuarioResult.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Usuário não encontrado." });
    }

    const customerId = usuarioResult[0].customerId;
    console.log("customerId encontrado no banco de dados:", customerId);

    // Estrutura para a requisição de tokenização
    const tokenBody = {
      creditCard: {
        holderName: cardDetails.cardHolder,
        number: cardDetails.cardNumber,
        expiryMonth: expirationMonth,
        expiryYear: expirationYear,
        ccv: cvv,
      },
      creditCardHolderInfo: {
        name: cardDetails.cardHolder,
        email: email,
        cpfCnpj: cpfCnpj,
        postalCode: postalCode,
        addressNumber: cardDetails.numeroCasa || "S/N",
        phone: telefone,
        mobilePhone: telefone,
        addressComplement: cardDetails.addressComplement || "",
      },
      customer: customerId, // Agora estamos usando o customerId da tabela users
      remoteIp: req.ip,
    };

    // Opções para a requisição da tokenização
    const tokenOptions = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        access_token: ASAAS_API_KEY, // Substitua com seu token de acesso correto
      },
      body: JSON.stringify(tokenBody),
    };

    // Realizar a requisição para a API Asaas
    const tokenResponse = await fetch(
      "https://www.asaas.com/api/v3/creditCard/tokenizeCreditCard",
      tokenOptions
    );

    // Captura a resposta da API como texto
    const responseText = await tokenResponse.text();
    console.log("Resposta da API:", responseText);

    // Verificar se a resposta foi bem-sucedida (status 2xx)
    if (!tokenResponse.ok) {
      console.error(
        `Erro na resposta: ${tokenResponse.status} - ${tokenResponse.statusText}`
      );
      return res.status(tokenResponse.status).json({
        success: false,
        message: "Erro ao tokenizar cartão.",
        error: responseText,
      });
    }

    // Tenta fazer o parse da resposta em JSON
    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (jsonParseError) {
      console.error("Erro ao parsear resposta JSON:", jsonParseError);
      return res.status(500).json({
        success: false,
        message:
          "Erro ao processar a resposta da API. A resposta não é um JSON válido.",
        error: jsonParseError.message,
      });
    }

    console.log("Token de cartão de crédito criado:", tokenData);

    // Resposta de sucesso
    res.json({
      success: true,
      message: "Assinatura criada com sucesso.",
      tokenData: tokenData,
    });
  } catch (err) {
    // Captura erros inesperados e envia resposta de erro
    console.error("Erro inesperado:", err);
    res.status(500).json({
      success: false,
      message: "Erro ao buscar informações do cliente ou tokenizar cartão.",
      error: err.message,
    });
  }
});

//TOKEN API INTER
const generateToken = async () => {
  try {
    const response = await axios.post(
      'https://cdpj.partners.bancointer.com.br/oauth/v2/token',
      'client_id=3fea13df-1e68-447c-b306-a87d7c058024&client_secret=79f8d856-bb83-4ada-a5d0-01b22cfe43c1&scope=cob.write&grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        httpsAgent: new (require('https')).Agent({
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath),
        })
      }
    );

    const token = response.data.access_token;
    const data_geracao = new Date();

    // Atualizar o banco de dados com o novo token e a data de geração
    const query = `
    UPDATE token
    SET token = ?, data_geracao = ?
    WHERE id = 1;
  `;
    db.execute(query, [token, data_geracao], (err, results) => {
      if (err) {
        console.error('Erro ao atualizar o banco de dados:', err);
        return;
      }
      console.log('Token atualizado com sucesso no banco de dados.');
    });

    return token; // Agora retorna o token gerado
  } catch (error) {
    console.error('Erro ao gerar o token:', error);
    throw error; // Lança o erro para ser tratado na rota
  }
};

// Rota para gerar o token via API
app.post('/gerar-token', async (req, res) => {
  try {
    const token = await generateToken();
    res.status(200).json({
      success: true,
      token: token,
      message: 'Token gerado e armazenado com sucesso!',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar o token.',
      error: error.message,
    });
  }
});

const getTokenFromDatabase = async () => {
  try {
    // Executando a consulta de forma assíncrona
    const [rows] = await db.execute("SELECT token FROM token LIMIT 1");

    // Verificando se o token foi encontrado
    if (rows.length > 0) {
      return rows[0].token;
    } else {
      throw new Error("Token não encontrado.");
    }
  } catch (err) {
    throw new Error('Erro ao recuperar o token: ' + err.message);
  }
};



app.post("/gerar-cobranca", async (req, res) => {
  // Informações que você já possui
  const token = await getTokenFromDatabase(); // Substitua pelo seu token real
  const contaCorrente = "409251879"; // Conta corrente selecionada

  // Corpo da requisição para criar a cobrança
  const corpo = {
    calendario: {
      expiracao: 3600,
    },
    valor: {
      original: "5.00", // Valor da cobrança
    },
    chave: "2b3925d5-d94c-4b96-9348-e6510ceae42d", 
  };

  try {
    // Configurar a requisição para criar a cobrança
    const config = {
      method: "post",
      url: "https://cdpj.partners.bancointer.com.br/pix/v2/cob", // URL da API do Banco Inter para criação de cobrança
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-conta-corrente": contaCorrente,
      },
      httpsAgent: new (require("https").Agent)({
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      }),
      data: corpo,
    };

    // Realizar a requisição usando axios
    const response = await axios(config);

    // Retornar a resposta da cobrança ao cliente
    res.status(200).json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error("Erro ao gerar a cobrança:", error.message);

    // Se o erro for um erro de uma API externa (como Axios ou outro serviço), pode ser útil exibir mais detalhes:
    if (error.response) {
      // Caso a resposta da API contenha detalhes de erro, mostre a resposta completa
      console.error("Detalhes da resposta do erro:", {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data, // Dados de erro enviados pela API
      });

      // Retornar a resposta completa de erro ao cliente
      return res.status(error.response.status).json({
        error: "Falha ao gerar a cobrança.",
        details: error.response.data,
      });
    } else if (error.request) {
      // Caso não tenha recebido uma resposta, exiba os detalhes da requisição
      console.error("Detalhes da requisição do erro:", error.request);

      // Retornar erro de requisição sem resposta
      return res.status(500).json({
        error: "Falha ao realizar a requisição.",
        details: error.request,
      });
    } else {
      // Se o erro não for relacionado a uma resposta ou requisição, exiba o erro completo
      console.error("Erro desconhecido:", error);

      // Retornar erro genérico
      return res.status(500).json({
        error: "Falha ao gerar a cobrança.",
        details: error.message,
      });
    }
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(
    `Servidor rodando em: https://higopromopage.onrender.com/${PORT}`
  );
});
