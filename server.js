const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const exphbs = require("express-handlebars");
const db = require("./db");

const app = express();
const hbs = exphbs.create({});

app.disable("x-powered-by");

const PORT = Number(process.env.PORT) || 8081;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SESSION_COOKIE_NAME = "sid";
const CSRF_COOKIE_NAME = "csrf_token";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60;
const RESET_TOKEN_MAX_AGE_MS = 1000 * 60 * 15;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;
const MAX_NAME_LENGTH = 80;
const sessions = new Map();
const passwordResetTokens = new Map();
const rateLimitStore = new Map();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; "));
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

  if (IS_PRODUCTION) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
});

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(express.json({ limit: "10kb" }));

app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");

const parseCookies = (req) => {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(";").reduce((acc, cookie) => {
    const [key, ...valueParts] = cookie.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(valueParts.join("="));
    return acc;
  }, {});
};

const appendCookie = (res, cookie) => {
  res.append("Set-Cookie", cookie);
};

const buildCookie = (name, value, options = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path || "/"}`];

  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure ?? IS_PRODUCTION) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (typeof options.maxAge === "number") parts.push(`Max-Age=${options.maxAge}`);

  return parts.join("; ");
};

const clearCookie = (res, name) => {
  appendCookie(res, buildCookie(name, "", {
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 0,
  }));
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const sanitizeName = (name) => String(name || "").trim().replace(/\s+/g, " ");
const isValidEmail = (email) => EMAIL_REGEX.test(email) && email.length <= 254;
const isValidPassword = (password) => (
  typeof password === "string" &&
  password.length >= MIN_PASSWORD_LENGTH &&
  password.length <= MAX_PASSWORD_LENGTH
);

const validatePasswordMessage = `A senha deve ter entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres.`;

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

const createCsrfToken = () => crypto.randomBytes(32).toString("hex");

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const requireCsrf = (req, res, next) => {
  const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);
  if (!unsafeMethods.has(req.method)) return next();

  const submittedToken = req.body?._csrf || req.headers["x-csrf-token"];
  if (!submittedToken || !safeCompare(submittedToken, req.csrfToken)) {
    return res.status(403).json({ status: 403, message: "Token CSRF inválido ou ausente." });
    return res.status(403).json({ message: "Token CSRF inválido ou ausente." });
  }

  return next();
};

const rateLimit = ({ windowMs, max, message }) => (req, res, next) => {
  const now = Date.now();
  const key = `${req.ip}:${req.method}:${req.path}`;
  const current = rateLimitStore.get(key);

  if (!current || now > current.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  current.count += 1;

  if (current.count > max) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({ status: 429, message });
    return res.status(429).json({ message });
  }

  return next();
};

setInterval(() => {
  const now = Date.now();

  for (const [sid, session] of sessions.entries()) {
    if (session.expiresAt <= now) sessions.delete(sid);
  }

  for (const [email, tokenData] of passwordResetTokens.entries()) {
    if (tokenData.expiresAt <= now) passwordResetTokens.delete(email);
  }

  for (const [key, limitData] of rateLimitStore.entries()) {
    if (limitData.resetAt <= now) rateLimitStore.delete(key);
  }
}, 1000 * 60 * 10).unref();

app.use((req, res, next) => {
  const cookies = parseCookies(req);
  const sid = cookies[SESSION_COOKIE_NAME];
  const session = getSession(sid);
  let csrfToken = cookies[CSRF_COOKIE_NAME];

  if (!csrfToken || !/^[a-f0-9]{64}$/i.test(csrfToken)) {
    csrfToken = createCsrfToken();
    appendCookie(res, buildCookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
    }));
  }

  req.usuarioLogado = session?.email || null;
  req.sid = sid;
  req.csrfToken = csrfToken;
  res.locals.csrfToken = csrfToken;
  next();
});

app.use(requireCsrf);

const loginLimiter = rateLimit({
  windowMs: 1000 * 60 * 15,
  max: 8,
  message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
});

const passwordRecoveryLimiter = rateLimit({
  windowMs: 1000 * 60 * 15,
  max: 5,
  message: "Muitas solicitações de recuperação. Tente novamente mais tarde.",
});

const requireAuth = (req, res, next) => {
  if (!req.usuarioLogado) {
    if (req.method === "GET") {
      return renderLogin(res, { error: "Faça login para acessar esta página." }, 401);
    }

    return res.status(401).json({ status: 401, message: "Autenticação necessária." });
    return res.status(401).json({ message: "Autenticação necessária." });
  }
  return next();
};

const renderLogin = (res, data = {}, statusCode = 200) => res.status(statusCode).render("login", {
  ...data,
  statusCode: statusCode >= 400 ? statusCode : null,
const renderLogin = (res, data = {}) => res.render("login", {
  ...data,
  minPasswordLength: MIN_PASSWORD_LENGTH,
  maxPasswordLength: MAX_PASSWORD_LENGTH,
});

const renderCadastro = (res, data = {}, statusCode = 200) => res.status(statusCode).render("cadastro", {
  ...data,
  statusCode: statusCode >= 400 ? statusCode : null,
const renderCadastro = (res, data = {}) => res.render("cadastro", {
  ...data,
  minPasswordLength: MIN_PASSWORD_LENGTH,
  maxPasswordLength: MAX_PASSWORD_LENGTH,
  maxNameLength: MAX_NAME_LENGTH,
});

app.get("/", (req, res) => {
  if (req.usuarioLogado) {
    return res.redirect("/home");
  }
  return renderLogin(res);
});

app.get("/login", (req, res) => {
  if (req.usuarioLogado) {
    return res.redirect("/home");
  }
  return renderLogin(res);
});

app.get("/cadastro", (req, res) => {
  if (req.usuarioLogado) {
    return res.redirect("/home");
  }
  return renderCadastro(res);
});

app.get("/home", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, name, email FROM users WHERE email = ?", [req.usuarioLogado]);

    if (rows.length > 0) {
      return res.render("home", { nome: rows[0].name });
    }

    if (req.sid) {
      sessions.delete(req.sid);
    }
    clearCookie(res, SESSION_COOKIE_NAME);
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
  clearCookie(res, SESSION_COOKIE_NAME);
  return res.redirect("/login");
});

app.post("/cadastro", async (req, res) => {
  const nome = sanitizeName(req.body.nome);
  const email = normalizeEmail(req.body.email);
  const { senha } = req.body;

  if (!nome || !email || !senha) {
    return renderCadastro(res, { error: "Por favor, preencha todos os campos.", nome, email }, 400);
  }

  if (nome.length > MAX_NAME_LENGTH) {
    return renderCadastro(res, { error: `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`, nome, email }, 400);
  }

  if (!isValidEmail(email)) {
    return renderCadastro(res, { error: "Informe um e-mail válido.", nome, email }, 400);
  }

  if (!isValidPassword(senha)) {
    return renderCadastro(res, { error: validatePasswordMessage, nome, email }, 400);
    return renderCadastro(res, { error: "Por favor, preencha todos os campos.", nome, email });
  }

  if (nome.length > MAX_NAME_LENGTH) {
    return renderCadastro(res, { error: `O nome deve ter no máximo ${MAX_NAME_LENGTH} caracteres.`, nome, email });
  }

  if (!isValidEmail(email)) {
    return renderCadastro(res, { error: "Informe um e-mail válido.", nome, email });
  }

  if (!isValidPassword(senha)) {
    return renderCadastro(res, { error: validatePasswordMessage, nome, email });
  }

  try {
    const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);

    if (rows.length > 0) {
      return renderCadastro(res, { error: "Esse email já está cadastrado.", nome, email });
    }

    const senhaHashed = await bcrypt.hash(senha, 12);

    await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [
      nome,
      email,
      senhaHashed,
    ]);

    return res.redirect("/login");
  } catch (err) {
    console.error("Erro ao cadastrar usuário:", err);
    return renderCadastro(res, { error: "Erro interno ao cadastrar. Tente novamente.", nome, email });
  }
});

app.post("/login", loginLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { senha } = req.body;

  if (!email || !senha) {
    return renderLogin(res, { error: "Por favor, preencha todos os campos.", email }, 400);
  }

  if (!isValidEmail(email)) {
    return renderLogin(res, { error: "Email ou senha inválidos", email }, 401);
    return renderLogin(res, { error: "Por favor, preencha todos os campos.", email });
  }

  if (!isValidEmail(email)) {
    return renderLogin(res, { error: "Email ou senha inválidos", email });
  }

  try {
    const [rows] = await db.query("SELECT id, email, password FROM users WHERE email = ?", [email]);

    if (rows.length > 0) {
      const usuario = rows[0];
      const senhaValida = await bcrypt.compare(senha, usuario.password);

      if (senhaValida) {
        const sid = createSession(usuario.email);
        appendCookie(res, buildCookie(SESSION_COOKIE_NAME, sid, {
          httpOnly: true,
          sameSite: "Lax",
          maxAge: Math.floor(SESSION_MAX_AGE_MS / 1000),
        }));
        return res.redirect("/home");
      }
    }

    return renderLogin(res, { error: "Email ou senha inválidos", email }, 401);
    return renderLogin(res, { error: "Email ou senha inválidos", email });
  } catch (err) {
    console.error("Erro ao realizar login:", err);
    return renderLogin(res, { error: "Erro interno ao realizar login. Tente novamente.", email });
  }
});

app.put("/usuario/nome", requireAuth, async (req, res) => {
  const novoNome = sanitizeName(req.body.novoNome);

  if (!novoNome || novoNome.length > MAX_NAME_LENGTH) {
    return res.status(400).json({ status: 400, message: `Informe um nome com até ${MAX_NAME_LENGTH} caracteres.` });
    return res.status(400).json({ message: `Informe um nome com até ${MAX_NAME_LENGTH} caracteres.` });
  }

  try {
    const [result] = await db.query(
      "UPDATE users SET name = ? WHERE email = ?",
      [novoNome, req.usuarioLogado]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 404, message: "Usuário não encontrado." });
    }

    res.json({ message: "Nome atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar nome:", err);
    res.status(500).json({ status: 500, message: "Erro interno ao atualizar nome." });
  }
});

app.put("/usuario/senha", requireAuth, async (req, res) => {
  const { novaSenha } = req.body;

  if (!isValidPassword(novaSenha)) {
    return res.status(400).json({ status: 400, message: validatePasswordMessage });
    return res.status(400).json({ message: validatePasswordMessage });
  }

  try {
    const senhaHashed = await bcrypt.hash(novaSenha, 12);

    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE email = ?",
      [senhaHashed, req.usuarioLogado]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 404, message: "Email não identificado." });
    }

    res.json({ message: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar senha:", err);
    res.status(500).json({ status: 500, message: "Erro interno ao atualizar senha." });
  }
});

app.post("/recuperar-senha", passwordRecoveryLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (!isValidEmail(email)) {
    return res.status(400).json({ status: 400, message: "Informe um e-mail válido." });
    return res.status(400).json({ message: "Informe um e-mail válido." });
  }

  try {
    const [rows] = await db.query("SELECT id FROM users WHERE email = ?", [email]);

    if (rows.length > 0) {
      const token = crypto.randomBytes(24).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      passwordResetTokens.set(email, {
        tokenHash,
        expiresAt: Date.now() + RESET_TOKEN_MAX_AGE_MS,
        attempts: 0,
      });

      console.log(`[RECUPERACAO] Token temporário para ${email}: ${token}`);

      return res.json({
        message: "Se o e-mail existir, um token temporário será enviado. Em desenvolvimento, confira o console do servidor.",
        devToken: IS_PRODUCTION ? undefined : token,
      });
    }

    return res.json({
      message: "Se o e-mail existir, um token temporário será enviado. Em desenvolvimento, confira o console do servidor.",
    });
  } catch (err) {
    console.error("Erro ao solicitar recuperação de senha:", err);
    return res.status(500).json({ status: 500, message: "Erro interno ao solicitar recuperação de senha." });
    return res.status(500).json({ message: "Erro interno ao solicitar recuperação de senha." });
  }
});

app.put("/recuperar-senha", passwordRecoveryLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const token = String(req.body.token || "").trim();
  const { novaSenha } = req.body;

  if (!isValidEmail(email) || !token || !isValidPassword(novaSenha)) {
    return res.status(400).json({ status: 400, message: "Dados inválidos para recuperação de senha." });
    return res.status(400).json({ message: "Dados inválidos para recuperação de senha." });
  }

  const tokenData = passwordResetTokens.get(email);
  if (!tokenData || tokenData.expiresAt < Date.now()) {
    passwordResetTokens.delete(email);
    return res.status(403).json({ status: 403, message: "Token inválido ou expirado." });
    return res.status(400).json({ message: "Token inválido ou expirado." });
  }

  tokenData.attempts += 1;
  if (tokenData.attempts > 5) {
    passwordResetTokens.delete(email);
    return res.status(429).json({ status: 429, message: "Muitas tentativas com token inválido. Solicite um novo token." });
    return res.status(429).json({ message: "Muitas tentativas com token inválido. Solicite um novo token." });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  if (!safeCompare(tokenHash, tokenData.tokenHash)) {
    return res.status(403).json({ status: 403, message: "Token inválido ou expirado." });
    return res.status(400).json({ message: "Token inválido ou expirado." });
  }

  try {
    const senhaHashed = await bcrypt.hash(novaSenha, 12);

    const [result] = await db.query(
      "UPDATE users SET password = ? WHERE email = ?",
      [senhaHashed, email]
    );

    passwordResetTokens.delete(email);

    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 404, message: "Email não identificado." });
    }

    res.json({ message: "Senha alterada com sucesso!" });
  } catch (err) {
    console.error("Erro ao recuperar senha:", err);
    res.status(500).json({ status: 500, message: "Erro interno ao atualizar senha." });
  }
});

app.delete("/usuario", requireAuth, async (req, res) => {
  try {
    await db.query("DELETE FROM users WHERE email = ?", [req.usuarioLogado]);

    if (req.sid) sessions.delete(req.sid);
    clearCookie(res, SESSION_COOKIE_NAME);

    res.json({ message: "Conta excluída com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar usuário:", err);
    res.status(500).json({ status: 500, message: "Erro ao excluir conta." });
  }
});

app.delete("/logout", requireAuth, (req, res) => {
  if (req.sid) sessions.delete(req.sid);

  clearCookie(res, SESSION_COOKIE_NAME);

  res.json({ message: "Logout realizado!" });
});

app.use((req, res) => {
  res.status(404);
  return renderLogin(res, { error: "Página não encontrada." });
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
app.listen(PORT, () => console.log(`O servidor está rodando na porta: ${PORT}`));
