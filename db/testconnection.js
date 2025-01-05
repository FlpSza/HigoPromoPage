const mysql = require('mysql2');

// Criação de um pool de conexões
const pool = mysql.createConnection({
    host: '193.203.175.157',
    user: 'u762300196_admin',
    password: 'higoViagens25',
    database: 'u762300196_higoviagens',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testando a conexão
pool.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conexão bem-sucedida ao banco de dados!');
    }
});
