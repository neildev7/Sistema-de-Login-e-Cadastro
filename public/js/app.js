const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || "";

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
};

const setMessage = (elementId, message, type = "info") => {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.innerText = message;
  element.classList.remove("message-success", "message-error", "message-info");
  element.classList.add(`message-${type}`);
};

const setupLoginPage = () => {
  const recoveryBox = document.getElementById("recuperacao");
  const showRecoveryLink = document.getElementById("mostrarRecuperacao");
  const cancelRecoveryButton = document.getElementById("cancelarRecuperacao");
  const requestTokenButton = document.getElementById("solicitarToken");
  const savePasswordButton = document.getElementById("salvarSenha");

  const resetRecoveryForm = () => {
    setMessage("msgRec", "");
    ["emailRec", "tokenRec", "novaSenha", "confirmarSenha"].forEach((id) => {
      const input = document.getElementById(id);
      if (input) input.value = "";
    });
  };

  showRecoveryLink?.addEventListener("click", (event) => {
    event.preventDefault();
    recoveryBox?.classList.remove("hidden");
  });

  cancelRecoveryButton?.addEventListener("click", () => {
    recoveryBox?.classList.add("hidden");
    resetRecoveryForm();
  });

  requestTokenButton?.addEventListener("click", async () => {
    const email = document.getElementById("emailRec")?.value.trim();

    if (!email) {
      setMessage("msgRec", "Informe seu e-mail.", "error");
      return;
    }

    setMessage("msgRec", "Solicitando token...", "info");

    try {
      const { response, data } = await requestJson("/recuperar-senha", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        setMessage("msgRec", data.message || "Erro ao solicitar token.", "error");
        return;
      }

      if (data.devToken) {
        const tokenInput = document.getElementById("tokenRec");
        if (tokenInput) tokenInput.value = data.devToken;
      }

      setMessage("msgRec", data.message || "Token solicitado com sucesso.", "success");
    } catch (erro) {
      console.error("Erro ao solicitar token:", erro);
      setMessage("msgRec", "Erro de conexão ao solicitar token.", "error");
    }
  });

  savePasswordButton?.addEventListener("click", async () => {
    const email = document.getElementById("emailRec")?.value.trim();
    const token = document.getElementById("tokenRec")?.value.trim();
    const novaSenha = document.getElementById("novaSenha")?.value;
    const confirmarSenha = document.getElementById("confirmarSenha")?.value;

    if (!email || !token || !novaSenha || !confirmarSenha) {
      setMessage("msgRec", "Preencha todos os campos.", "error");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setMessage("msgRec", "As senhas não coincidem.", "error");
      return;
    }

    setMessage("msgRec", "Salvando nova senha...", "info");

    try {
      const { response, data } = await requestJson("/recuperar-senha", {
        method: "PUT",
        body: JSON.stringify({ email, token, novaSenha }),
      });

      if (!response.ok) {
        setMessage("msgRec", data.message || "Erro ao salvar a nova senha.", "error");
        return;
      }

      setMessage("msgRec", data.message || "Senha alterada com sucesso.", "success");
      setTimeout(() => {
        recoveryBox?.classList.add("hidden");
        resetRecoveryForm();
      }, 3000);
    } catch (erro) {
      console.error("Erro ao recuperar senha:", erro);
      setMessage("msgRec", "Erro de conexão ao tentar alterar a senha.", "error");
    }
  });
};

const setupHomePage = () => {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      const { response } = await requestJson("/logout", { method: "DELETE" });

      if (response.ok) {
        window.location.href = "/login";
      } else {
        alert("Erro ao tentar sair da conta.");
      }
    } catch (erro) {
      console.error("Erro na requisição de logout:", erro);
      alert("Erro de conexão ao tentar sair.");
    }
  });

  document.getElementById("atualizarNomeBtn")?.addEventListener("click", async () => {
    const novoNome = document.getElementById("novoNome")?.value.trim();

    if (!novoNome) {
      setMessage("msgNome", "Digite um nome válido.", "error");
      return;
    }

    try {
      const { response, data } = await requestJson("/usuario/nome", {
        method: "PUT",
        body: JSON.stringify({ novoNome }),
      });

      setMessage("msgNome", data.message || "Solicitação concluída.", response.ok ? "success" : "error");

      if (response.ok) setTimeout(() => location.reload(), 1000);
    } catch (erro) {
      console.error("Erro ao atualizar nome:", erro);
      setMessage("msgNome", "Erro ao atualizar o nome.", "error");
    }
  });

  document.getElementById("atualizarSenhaBtn")?.addEventListener("click", async () => {
    const novaSenha = document.getElementById("novaSenhaUsuario")?.value;

    if (!novaSenha) {
      setMessage("msgSenha", "Digite uma nova senha.", "error");
      return;
    }

    try {
      const { response, data } = await requestJson("/usuario/senha", {
        method: "PUT",
        body: JSON.stringify({ novaSenha }),
      });

      setMessage("msgSenha", data.message || "Solicitação concluída.", response.ok ? "success" : "error");
    } catch (erro) {
      console.error("Erro ao atualizar senha:", erro);
      setMessage("msgSenha", "Erro ao atualizar a senha.", "error");
    }
  });

  document.getElementById("excluirContaBtn")?.addEventListener("click", async () => {
    const confirmacao = confirm("Tem certeza que deseja excluir sua conta?");
    if (!confirmacao) return;

    try {
      const { response } = await requestJson("/usuario", { method: "DELETE" });

      if (response.ok) {
        alert("Conta excluída com sucesso!");
        window.location.href = "/login";
      } else {
        alert("Erro ao excluir a conta.");
      }
    } catch (erro) {
      console.error("Erro ao excluir conta:", erro);
      alert("Erro de conexão ao tentar excluir a conta.");
    }
  });
};

if (document.querySelector('[data-page="login"]')) setupLoginPage();
if (document.querySelector('[data-page="home"]')) setupHomePage();
