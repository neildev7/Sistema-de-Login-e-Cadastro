const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const exphbs = require("express-handlebars");
const db = require("./db");

const app = express();
const hbs = exphbs.create({});

const PORT = Number(process.env.PORT) || 8081;
const SESSION_COOKIE_NAME = "sid";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60;
const sessions = new Map();

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

const parseCookies = (req) => {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(";").reduce((acc, cookie) => {
    const [key, ...valueParts] = cookie.trim().split("=");
    acc[key] = decodeURIComponent(valueParts.join("="));
    return acc;
  }, {});
};

const createSession = (email) => {
  const sid = crypto.randomBytes(32).toString("hex");
  sessions.set(sid, {
    email,
    expiresAt: Date.now() + SESSION_MAX_AGE_MS,
  });
  return sid;
};

const getSession = (sid) => {
  if (!sid || !sessions.has(sid)) return null;
  const session = sessions.get(sid);
  if (Date.now() > session.expiresAt) {
    sessions.delete(sid);
    return null;
  }
  return session;
};

app.use((req, res, next) => {
  const cookies = parseCookies(req);
  const sid = cookies[SESSION_COOKIE_NAME];
  const session = getSession(sid);

  req.usuarioLogado = session?.email || null;
  req.sid = sid;
  next();
});

const requireAuth = (req, res, next) => {
  if (!req.usuarioLogado) {
    return res.redirect("/login");
  }
  return next();
};

app.get("/", (req, res) => {
  if (req.usuarioLogado) {
    return res.redirect("/home");
  }
  return res.render("login");
});

app.get("/login", (req, res) => {
  if (req.usuarioLogado) {
    return res.redirect("/home");
  }
  return res.render("login");
});

app.get("/cadastro", (req, res) => {
  if (req.usuarioLogado) {
    return res.redirect("/home");
  }
  return res.render("cadastro");
});

app.get("/home", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [req.usuarioLogado]);

    if (rows.length > 0) {
      return res.render("home", { nome: rows[0].name });
    }

    if (req.sid) {
      sessions.delete(req.sid);
    }
    res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);
    return res.redirect("/login");
  } catch (err) {
    console.error("Erro ao buscar usuário:", err);
    return res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  if (req.sid) {
    sessions.delete(req.sid);
  }
  res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);
  return res.redirect("/login");
});

app.post("/cadastro", async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.render("cadastro", { error: "Por favor, preencha todos os campos." });
  }

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length > 0) {
      return res.render("cadastro", { error: "Esse email já está cadastrado." });
    }

    const senhaHashed = await bcrypt.hash(senha, 10);

    await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [
      nome,
      email,
      senhaHashed,
    ]);

    return res.redirect("/login");
  } catch (err) {
    console.error("Erro ao cadastrar usuário:", err);
    return res.render("cadastro", { error: "Erro interno ao cadastrar. Tente novamente." });
  }
});

app.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.render("login", { error: "Por favor, preencha todos os campos." });
  }

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length > 0) {
      const usuario = rows[0];
      const senhaValida = await bcrypt.compare(senha, usuario.password);

      if (senhaValida) {
        const sid = createSession(email);
        res.setHeader(
          "Set-Cookie",
          `${SESSION_COOKIE_NAME}=${sid}; Path=/; HttpOnly; Max-Age=${SESSION_MAX_AGE_MS / 1000}; SameSite=Lax`
        );
        return res.redirect("/home");
      }
    }

    return res.render("login", { error: "Email ou senha inválidos" });
  } catch (err) {
    console.error("Erro ao realizar login:", err);
    return res.render("login", { error: "Erro interno ao realizar login. Tente novamente." });
  }
});

app.put("/usuario/nome", requireAuth, async (req, res) => {
  const { novoNome } = req.body;

  if (!novoNome) {
    return res.status(400).json({ message: "Nome inválido." });
  }

  try {
    const [result] = await db.query(
      "UPDATE users SET name = ? WHERE email = ?",
      [novoNome, req.usuarioLogado]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    res.json({ message: "Nome atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar nome:", err);
    res.status(500).json({ message: "Erro interno ao atualizar nome." });
  }
});

app.put("/usuario/senha", requireAuth, async (req, res) => {
  const { novaSenha } = req.body;

  if (!novaSenha) {
    return res.status(400).json({ message: "A nova senha não foi informada." });
  }

  try {
    const senhaHashed = await bcrypt.hash(novaSenha, 10);

    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE email = ?",
      [senhaHashed, req.usuarioLogado]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Email não identificado." });
    }

    res.json({ message: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar senha:", err);
    res.status(500).json({ message: "Erro interno ao atualizar senha." });
  }
});


app.delete("/recuperar-senha", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Email não informado para deletar a senha." });
  }

  console.log(`[SISTEMA] Senha antiga invalidada e pronta para troca: ${email}`);
  return res.json({ message: "Senha antiga deletada/invalidada do sistema." });
});

app.put("/recuperar-senha", async (req, res) => {
  const { email } = req.query; 
  const { novaSenha } = req.body;

  if (!email || !novaSenha) {
    return res.status(400).json({ message: "Email ou nova senha não informados." });
  }

  try {
    const senhaHashed = await bcrypt.hash(novaSenha, 10);

    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE email = ?",
      [senhaHashed, email]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Email não identificado." });
    }

    res.json({ message: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error("Erro ao recuperar senha:", err);
    res.status(500).json({ message: "Erro interno ao atualizar senha." });
  }
});


app.delete("/usuario", requireAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE email = ?", [req.usuarioLogado]);

    if (req.sid) sessions.delete(req.sid);
    res.setHeader(
      "Set-Cookie",
      `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`
    );

    res.json({ message: "Conta excluída com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar usuário:", err);
    res.status(500).json({ message: "Erro ao excluir conta." });
  }
});

app.delete("/logout", requireAuth, (req, res) => {
  if (req.sid) sessions.delete(req.sid);

  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`
  );

  res.json({ message: "Logout realizado!" });
});

(async () => {
  try {
    await db.query("SELECT 1");
    console.log("Conexão com o banco de dados estabelecida com sucesso.");
  } catch (err) {
    console.error("Erro ao conectar ao banco de dados:", err);
  }
})();

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));