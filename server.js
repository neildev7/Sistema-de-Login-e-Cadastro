// Importa o framework Express para criar o servidor
const express = require("express");
const app = express();

// Utilizando bcrypt para hash de senhas
const bcrypt = require('bcrypt');

// Importa o Express-Handlebars para gerenciar templates
const exphbs = require('express-handlebars');
const hbs = exphbs.create({});

// Importa o Body-Parser para processar dados enviados via POST
const bodyParser = require('body-parser');

// Importa o módulo de conexão com o banco de dados
const db = require("./db");


// Variável para armazenar o usuário logado
let usuarioLogado = null;

// Configura o uso de arquivos estáticos na pasta "public"
app.use(express.static("public"));

// Configura o Body-Parser para processar dados de formulários
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Configura o Express-Handlebars como engine de templates
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// Rota principal ("/") que renderiza a página de login
app.get("/", (req, res) => {
    res.render("login");
});

// Rota para a página de login
app.get("/login", (req, res) => {
    res.render("login");
});

// Rota para a página de cadastro
app.get("/cadastro", (req, res) => {
    res.render("cadastro");
});

// Rota para a página inicial (home), acessível apenas se o usuário estiver logado
app.get("/home", async (req, res) => {
    if (usuarioLogado) {
        try {
            // Busca o usuário logado no banco de dados pelo email
            const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [usuarioLogado]);
            if (rows.length > 0) {
                // Renderiza a página inicial com o nome do usuário
                res.render("home", { nome: rows[0].name });
            } else {
                // Redireciona para a página de login se o usuário não for encontrado
                res.redirect("/login");
            }
        } catch (err) {
            // Trata erros ao buscar o usuário no banco de dados
            console.error("Erro ao buscar usuário:", err);
            res.redirect("/login");
        }
    } else {
        // Redireciona para a página de login se não houver usuário logado
        res.redirect("/login");
    }
});


// Rota para logout, que limpa o usuário logado e redireciona para o login
app.get("/logout", (req, res) => {
    usuarioLogado = null;
    res.redirect("/login");
});


// Rota POST para cadastro de novos usuários no banco de dados
app.post("/cadastro", async (req, res) => {
    const { nome, email, senha } = req.body;

    // Verifica se todos os campos foram preenchidos
    if (!nome || !email || !senha) {
        return res.render("cadastro", { error: "Por favor, preencha todos os campos." });
    }

    try {
        // Verifica se já existe um usuário com o mesmo email no banco de dados
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (rows.length > 0) {
            return res.render("cadastro", { error: "Esse email já está cadastrado." });
        }
        
        // Gera um hash para a senha do usuário
        const saltRounds = 10;
        const senhaHashed = await bcrypt.hash(senha, saltRounds);
        
        // Insere o novo usuário no banco de dados
        await db.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [nome, email, senhaHashed]
        );

        // Redireciona para a página de login após o cadastro
        res.redirect("/login");

    } catch (err) {
        // Trata erros durante o cadastro
        console.error("Erro ao cadastrar usuário:", err);
        res.render("cadastro", { error: "Erro interno ao cadastrar. Tente novamente." });
    }
});

// Rota POST para login de usuários
app.post("/login", async (req, res) => {
    const { email, senha } = req.body;

    // Verifica se todos os campos foram preenchidos
    if (!email || !senha) {
        return res.render("login", { error: "Por favor, preencha todos os campos." });
    }

    try {
        // Busca o usuário pelo email no banco de dados
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

        if (rows.length > 0) {
            const usuario = rows[0];

            // Compara a senha enviada com o hash armazenado no banco de dados
            const senhaValida = await bcrypt.compare(senha, usuario.password);

            if (senhaValida) {
                // Define o email do usuário logado e redireciona para a página inicial
                usuarioLogado = email;
                res.redirect("home");
            } else {
                // Retorna erro se a senha for inválida
                res.render("login", { error: "Email ou senha inválidos" });
            }
        } else {
            // Retorna erro se o email não for encontrado
            res.render("login", { error: "Email ou senha inválidos" });
        }
    } catch (err) {
        // Trata erros durante o login
        console.error("Erro ao realizar login:", err);
        res.render("login", { error: "Erro interno ao realizar login. Tente novamente." });
    }
});


// Função autoexecutável para verificar a conexão com o banco de dados ao iniciar o servidor
(async () => {
    try {
        // Testa a conexão com o banco de dados
        const [rows] = await db.query("SELECT 1"); 
        console.log("Conexão com o banco de dados estabelecida com sucesso.");
    } catch (err) {
        // Trata erros ao conectar ao banco de dados
        console.error("Erro ao conectar ao banco de dados:", err);
    }
})();

// Inicia o servidor na porta 8081
app.listen(8081, () => console.log("Server is running on port 8081"));