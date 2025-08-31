const express = require("express");
const app = express();
const exphbs = require('express-handlebars');
const hbs = exphbs.create({});
const bodyParser = require('body-parser');
let usuariosValidos = [
    { nome: "Admin", email: "admin@admin.com", senha: "123456" },
    { nome: "Usuario", email: "usuario@usuario.com", senha: "654321" },
    { nome: "Teste", email: "teste@teste.com", senha: "111111" }
];
let usuarioLogado = null;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');



app.get("/", (req, res) => {
    res.render("login");
});

app.get("/login", (req, res) => {
    res.render("login");
});


app.get("/cadastro", (req, res) => {
    res.render("cadastro");
});

app.get("/home", (req, res) => {
    if (usuarioLogado) {
        const usuario = usuariosValidos.find(u => u.email === usuarioLogado);
        res.render("home", { nome: usuario.nome });
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", (req, res) => {
    usuarioLogado = null;
    res.redirect("/login");
});



app.post("/cadastro", (req, res) => {

    if (!req.body.nome || !req.body.email || !req.body.senha) {
        return res.render("cadastro", { error: "Por favor, preencha todos os campos." });
    }

    const { nome, email, senha } = req.body;
    usuariosValidos.push({ nome, email, senha });
    res.redirect("/");
});

app.post("/login", (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.render("login", { error: "Por favor, preencha todos os campos." });
    }

    const usuario = usuariosValidos.find(u => u.email === email && u.senha === senha);
    if (usuario) {
        usuarioLogado = email;
        res.redirect("home");
    } else {
        res.render("login", { error: "Email ou senha inválidos" });
    }
});








app.listen(8081, () => console.log("Server is running on port 8081"));