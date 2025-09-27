# 🗂️ Sistema de Login e Cadastro

Este projeto implementa um **sistema web de login e cadastro** utilizando **Node.js, Express e Handlebars**.  
O objetivo é permitir que usuários criem contas, façam login de forma segura e acessem páginas personalizadas.

Este projeto foi desenvolvido como parte do meu aprendizado em **desenvolvimento web**, aplicando conceitos de **back-end, front-end, templates dinâmicos e validação de dados**.

---

## 📌 Sobre o Projeto

O sistema realiza:

- 📝 **Cadastro de usuários** com validação de campos obrigatórios  
- 🔒 **Login seguro**, verificando email e senha  
- 🏠 **Página inicial personalizada** para cada usuário logado  
- 🚪 **Logout** para encerrar a sessão  
- 💾 **Integração com banco de dados MySQL** para armazenamento de usuários  
- 🔐 **Proteção de senhas com bcrypt**  

> Toda a lógica do sistema foi implementada por mim, enquanto o CSS foi gerado com auxílio de IA para acelerar o desenvolvimento, mas pretendo aprimorá-lo futuramente.

---

## 🚀 Tecnologias Utilizadas

- **Node.js** – execução do servidor  
- **Express** – gerenciamento de rotas e requisições  
- **Handlebars** – template engine para páginas dinâmicas  
- **HTML5 & CSS3** – estrutura e estilo das páginas  
- **MySQL** – banco de dados relacional  
- **bcrypt** – criptografia e proteção de senhas  

---

## 📂 Estrutura do Projeto

- `server.js` – Arquivo principal do servidor  
- `db.js` ou `connection.js` – Conexão com o banco de dados MySQL  
- `views/` – Templates Handlebars para páginas  
- `public/` – Arquivos estáticos (CSS, imagens, scripts)  

---

## ▶️ Como Usar

1. Clone o repositório: git clone https://github.com/neildev7/Sistema-de-Login-e-Cadastro.git
2. npm install
3. Crie um arquivo .env com suas credenciais do banco de dados:
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=sua_senha
   DB_NAME=usuarioslogin
4. Execute o servidor: node server.js
5. Abra o navegador em http://localhost:8081

## Contato

- Linkedin: [Neil Lopes](https://www.linkedin.com/in/neil-lopes-4a33a5383)
- E-mail: **neillopes237@gmail.com**
- Instagram: **neilzsz**

---

> Este projeto foi desenvolvido como parte do meu aprendizado em desenvolvimento web, aplicando conceitos de automação, integração front-end e back-end, e contribuindo para a construção do meu portfólio profissional.

