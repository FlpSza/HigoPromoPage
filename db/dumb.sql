-- Criação do banco de dados
CREATE DATABASE higo;

-- Seleciona o banco de dados para uso
USE higo;

-- Criação da tabela users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,        -- ID único para cada usuário
    username VARCHAR(50) NOT NULL,            -- Nome de usuário
    email VARCHAR(100) UNIQUE NOT NULL,       -- E-mail do usuário, deve ser único
    phone VARCHAR(15),                        -- Telefone do usuário
    password_hash VARCHAR(255) NOT NULL,      -- Hash da senha para segurança
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Data de criação do registro
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- Data de atualização
);
