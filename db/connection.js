const mysql = require('mysql2');

// Criação de um pool de conexões
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'higo',
    waitForConnections: true,
    connectionLimit: 1000, // Número máximo de conexões no pool
    queueLimit: 0        // Sem limite para filas de espera
});

// Exportando o pool
module.exports = pool.promise(); // Usando Promises para operações mais modernas
