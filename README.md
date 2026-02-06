# 🗂️ Sistema de Login e Cadastro

Sistema web de **cadastro e login de usuários** com **Node.js, Express, Handlebars e MySQL**.

## 📌 Funcionalidades

- 📝 Cadastro de usuários com validação de campos obrigatórios
- 🔒 Login com senha criptografada em **bcrypt**
- 🍪 Sessão por navegador usando cookie `HttpOnly`
- 🏠 Página inicial personalizada após autenticação
- 🚪 Logout com encerramento de sessão

## 🚀 Tecnologias

- Node.js
- Express
- Express Handlebars
- MySQL (`mysql2`)
- bcrypt
- dotenv

## 📂 Estrutura

- `server.js` – servidor HTTP e rotas
- `db.js` – conexão com banco de dados via pool MySQL
- `db.sql` – script de criação do banco e tabela
- `views/` – páginas Handlebars
- `public/` – arquivos estáticos (CSS)

## ▶️ Como usar

1. Clone o projeto
2. Instale dependências:

   ```bash
   npm install
   ```

3. Crie o arquivo `.env`:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=sua_senha
   DB_NAME=usuarioslogin
   PORT=8081
   ```

4. Crie banco/tabela executando o arquivo `db.sql` no MySQL.

5. Rode em desenvolvimento:

   ```bash
   npm run dev
   ```

   Ou em modo normal:

   ```bash
   npm start
   ```

6. Abra `http://localhost:8081`.

## 📜 Scripts

- `npm start` – inicia com Node
- `npm run dev` – inicia com nodemon
- `npm test` – valida sintaxe do `server.js`

## Contato

- Linkedin: [Neil Lopes](https://www.linkedin.com/in/neil-lopes-4a33a5383)
- E-mail: **neillopes237@gmail.com**
- Instagram: **neilzsz**
