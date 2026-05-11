// 1. Rastreador inicial: Verifica se o arquivo JS foi carregado pelo Express
console.log("✅ O arquivo home.js foi carregado com sucesso pelo navegador!");

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ O HTML terminou de carregar!");

    const agentCards = document.querySelectorAll('.agent-card');
    
    // 2. Verifica se o JS está achando os cartões do HTML
    console.log("🎯 Cartões de agentes encontrados na tela:", agentCards.length);

    if (agentCards.length === 0) {
        console.error("❌ ERRO: O JavaScript não achou os cartões. Verifique se o HTML tem a classe 'agent-card'.");
        return; // Para o código aqui se não achar os cartões
    }

    const infoPanel = document.getElementById('agentInfoPanel');
    const infoName = document.getElementById('infoName');
    const infoRole = document.getElementById('infoRole');
    const infoDescription = document.getElementById('infoDescription');
    const infoAbilities = document.getElementById('infoAbilities');

    // Dados dos agentes
    const agentsData = {
        jett: {
            name: "JETT", role: "Duelista",
            description: "Representando a Coreia do Sul, Jett tem um estilo de luta ágil e evasivo.",
            abilities: ["Corrente de Brisa (C)", "Brisa de Impulso (Q)", "Brisa de Impulso (E)", "Tormenta de Aço (X)"]
        },
        reyna: {
            name: "REYNA", role: "Duelista",
            description: "Criada no coração do México, Reyna domina o combate individual.",
            abilities: ["Olhar Voraz (C)", "Devorar (Q)", "Dispensar (E)", "Imperatriz (X)"]
        },
        phoenix: {
            name: "PHOENIX", role: "Duelista",
            description: "O poder estelar de Phoenix brilha em seu estilo de combate, incendiando o campo de batalha.",
            abilities: ["Labareda (C)", "Bola Curva (Q)", "Mãos Quentes (E)", "Renascimento (X)"]
        },
        omen: {
            name: "OMEN", role: "Controlador",
            description: "Um fantasma de uma memória, Omen caça nas sombras.",
            abilities: ["Passos Tenebrosos (C)", "Paranoia (Q)", "Manto Sombrio (E)", "Salto das Sombras (X)"]
        },
        sage: {
            name: "SAGE", role: "Sentinela",
            description: "A fortaleza da China, Sage traz segurança para si mesma e para a equipe.",
            abilities: ["Orbe de Barreira (C)", "Orbe de Lentidão (Q)", "Orbe Curativo (E)", "Ressurreição (X)"]
        },
        sova: {
            name: "SOVA", role: "Iniciador",
            description: "Nascido sob o eterno inverno da tundra russa, Sova rastreia e encontra inimigos.",
            abilities: ["Rastreador (C)", "Flecha de Choque (Q)", "Flecha Rastreadora (E)", "Fúria do Caçador (X)"]
        }
    };

    agentCards.forEach(card => {
        card.addEventListener('click', () => {
            const agentId = card.getAttribute('data-agent');
            
            // 3. Rastreador de clique
            console.log("🖱️ Você clicou no agente:", agentId);

            // Remove de todos e adiciona no clicado
            agentCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');

            const data = agentsData[agentId];

            if (data) {
                console.log("📄 Carregando painel do(a)", data.name);
                infoName.textContent = data.name;
                infoRole.textContent = data.role;
                infoDescription.textContent = data.description;
                
                infoAbilities.innerHTML = '';
                data.abilities.forEach(ability => {
                    const li = document.createElement('li');
                    li.textContent = ability;
                    infoAbilities.appendChild(li);
                });

                infoPanel.style.display = 'block';
            } else {
                console.error("❌ ERRO: Dados não encontrados para o agente", agentId);
            }
        });
    });
});