const mysql = require('mysql2');

// Criação de um pool de conexões
const pool = mysql.createPool({
    host: '193.203.175.157',
    user: 'u762300196_admin',
    password: 'higoViagens25',
    database: 'u762300196_higoviagens',
    waitForConnections: true,
    connectionLimit: 10, // Número máximo de conexões no pool
    queueLimit: 0        // Sem limite para filas de espera
});

// Exportando o pool
module.exports = pool.promise(); // Usando Promises para operações mais modernas
