const db = require('../db/connection');

const UserModel = {
    createUser: async (userData) => {
        const { name, email, password } = userData;
        const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        return db.query(query, [name, email, password]);
    },
    getUserByEmail: async (email) => {
        const query = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.query(query, [email]);
        return rows[0];
    }
};

module.exports = UserModel;
