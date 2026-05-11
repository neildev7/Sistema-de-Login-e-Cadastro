# 🗂️ Sistema de Login e Cadastro

Sistema web de **cadastro e login de usuários** com **Node.js, Express, Handlebars e MySQL**.

## 📌 Funcionalidades

- 📝 Cadastro de usuários com validação de campos obrigatórios, tamanho de nome, e-mail e senha
- 🔒 Login com senha criptografada em **bcrypt**
- 🍪 Sessão por navegador usando cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção
- 🛡️ Headers de segurança configurados diretamente no Express
- 🧾 Proteção CSRF para rotas `POST`, `PUT`, `PATCH` e `DELETE`
- 🚦 Limite de tentativas para login e recuperação de senha
- 🔑 Recuperação de senha com token temporário, expiração e limite de tentativas
- 🏠 Página inicial personalizada após autenticação
- 👤 Alteração de nome, alteração de senha, exclusão de conta e logout

## 🚀 Tecnologias

- Node.js
- Express
- Express Handlebars
- MySQL (`mysql2`)
- bcrypt
- dotenv

## 📂 Estrutura

- `server.js` – servidor HTTP, rotas, autenticação, headers de segurança, CSRF e rate limit
- `db.js` – conexão com banco de dados via pool MySQL
- `db.sql` – script de criação do banco e tabela
- `.env.example` – exemplo de variáveis de ambiente necessárias
- `views/` – páginas Handlebars
- `public/css/` – estilos da aplicação
- `public/js/` – JavaScript do frontend

## ▶️ Como usar

1. Clone o projeto.

2. Instale dependências:

   ```bash
   npm install
   ```

3. Crie o arquivo `.env` a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

4. Ajuste as credenciais no arquivo `.env`:

   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=sua_senha
   DB_NAME=usuarioslogin
   PORT=8081
   NODE_ENV=development
   ```

5. Crie banco/tabela executando o arquivo `db.sql` no MySQL.

6. Rode em desenvolvimento:

   ```bash
   npm run dev
   ```

   Ou em modo normal:

   ```bash
   npm start
   ```

7. Abra `http://localhost:8081`.

## 🔐 Observações de segurança

- Em produção, use HTTPS e defina `NODE_ENV=production` para habilitar o atributo `Secure` nos cookies e o header `Strict-Transport-Security`.
- A recuperação de senha gera um token temporário de 15 minutos. Em desenvolvimento, o token também aparece na resposta para facilitar testes; em produção, ele deve ser enviado por e-mail ou outro canal seguro.
- As senhas devem ter entre 8 e 72 caracteres.
- As rotas sensíveis usam token CSRF no corpo do formulário ou no header `X-CSRF-Token`.

## 📜 Scripts

- `npm start` – inicia com Node
- `npm run dev` – inicia com nodemon
- `npm test` – valida sintaxe do `server.js`

## Contato

- Linkedin: [Neil Lopes](https://www.linkedin.com/in/neil-lopes-4a33a5383)
- E-mail: **neillopes237@gmail.com**
- Instagram: **neilzsz**
