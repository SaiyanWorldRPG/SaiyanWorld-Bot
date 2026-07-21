// =============================================================================
// BOT DO DISCORD + SERVIDOR WEB INTEGRADO COM O JOGO
// =============================================================================
const { Octokit } = require("@octokit/rest");
const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ESSENCIAL: Lê os dados enviados pelo jogo

// Discord.js Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// GitHub API
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const owner = process.env.GITHUB_USER;
const repo = process.env.GITHUB_REPO;
const filePath = "docs/rewards.json";

// Função auxiliar para baixar do GitHub
async function getRewardsJSON() {
  try {
    const res = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath
    });
    const content = Buffer.from(res.data.content, "base64").toString("utf8");
    return { json: JSON.parse(content), sha: res.data.sha };
  } catch (err) {
    console.error("Erro ao baixar rewards.json:", err);
    return { json: {}, sha: null };
  }
}

// Função auxiliar para salvar no GitHub
async function saveRewardsJSON(newJSON, sha) {
  try {
    const contentEncoded = Buffer.from(JSON.stringify(newJSON, null, 2)).toString("base64");
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: "Atualizar recompensas via Servidor/Bot",
      content: contentEncoded,
      sha
    });
    return true;
  } catch (err) {
    console.error("Erro ao salvar rewards.json:", err);
    return false;
  }
}

// -----------------------------------------------------------
// ROTA /clear (Chamada pelo jogo RPG Maker via GET)
// -----------------------------------------------------------
app.get("/clear", async (req, res) => {
    const playerId = req.query.playerId;
    console.log(`-> Rota GET /clear acionada para o ID: [${playerId}]`);

    if (!playerId) {
        return res.status(400).json({ success: false, error: "playerId ausente" });
    }

    try {
        const { json, sha } = await getRewardsJSON();
        const targetId = String(playerId).replace(/\D/g, "");
        let foundKey = null;

        for (const key of Object.keys(json)) {
            const cleanKey = String(key).replace(/\u00A0/g, "").replace(/\D/g, "").trim();
            if (cleanKey === targetId) {
                foundKey = key;
                break;
            }
        }

        if (foundKey) {
            delete json[foundKey];
            const success = await saveRewardsJSON(json, sha);
            if (success) {
                console.log(`-> Recompensas limpas com sucesso para a chave: "${foundKey}"`);
                return res.json({ success: true, message: "Removido com sucesso" });
            }
        } else {
            console.log(`-> Nenhuma entrada encontrada para o ID: ${targetId}`);
        }

        return res.json({ success: true, message: "ID processado" });
    } catch (err) {
        console.error("Erro ao limpar recompensas no GitHub:", err);
        res.status(500).json({ success: false, error: "Erro ao limpar recompensas" });
    }
});

// Mantém a porta ativa para o Railway não desligar o bot
app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor web e Bot do Discord ativos!");
});

// -----------------------------------------------------------
// Comandos do Discord com Validação Segura
// -----------------------------------------------------------
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  // Comando !give <ID> <ESPECIE> <LEVEL>
  if (msg.content.startsWith("!give")) {
    const args = msg.content.trim().split(/\s+/);
    if (args.length < 4) {
      return msg.reply("Uso incorreto! Use: `!give [ID] [ESPECIE] [LEVEL]` (Ex: `!give 54596 charmander 15`)");
    }

    const playerId = args[1].padStart(5, "0");
    const species = args[2].toUpperCase();
    const level = parseInt(args[3]);

    if (isNaN(level) || level <= 0) {
      return msg.reply("Erro: O nível do Pokémon precisa ser um número válido maior que 0.");
    }

    console.log(`Enviando Pokémon ${species} Nv.${level} para o jogador ${playerId}`);
    const { json, sha } = await getRewardsJSON();
    if (!json[playerId]) json[playerId] = [];
    
    json[playerId].push({ type: "pokemon", species: species, level: level });
    const ok = await saveRewardsJSON(json, sha);
    return msg.reply(ok ? `Pokémon ${species} Nv.${level} enviado para ${playerId}!` : "Erro ao salvar no GitHub.");
  }

  // Comando !item <ID> <ITEM> <QUANTIDADE>
  if (msg.content.startsWith("!item")) {
    const args = msg.content.trim().split(/\s+/);
    if (args.length < 4) {
      return msg.reply("Uso incorreto! Use: `!item [ID] [NOME_ITEM] [QUANTIDADE]`");
    }

    const playerId = args[1].padStart(5, "0");
    const item = args[2].toUpperCase();
    const qty = parseInt(args[3]);

    if (isNaN(qty) || qty <= 0) {
      return msg.reply("Erro: A quantidade do item precisa ser um número válido.");
    }

    console.log(`Enviando ${qty}x ${item} para o jogador ${playerId}`);
    const { json, sha } = await getRewardsJSON();
    if (!json[playerId]) json[playerId] = [];
    
    json[playerId].push({ type: "item", item: item, qty: qty });
    const ok = await saveRewardsJSON(json, sha);
    return msg.reply(ok ? `${qty}x ${item} enviados para ${playerId}!` : "Erro ao salvar no GitHub.");
  }

  // Comando !coins <ID> <QUANTIDADE>
  if (msg.content.startsWith("!coins")) {
    const args = msg.content.trim().split(/\s+/);
    if (args.length < 3) {
      return msg.reply("Uso incorreto! Use: `!coins [ID] [QUANTIDADE]`");
    }

    const playerId = args[1].padStart(5, "0");
    const amount = parseInt(args[2]);

    if (isNaN(amount) || amount <= 0) {
      return msg.reply("Erro: A quantidade de coins precisa ser um número válido.");
    }

    console.log(`Enviando ${amount} Saiyan Coins para o jogador ${playerId}`);
    const { json, sha } = await getRewardsJSON();
    if (!json[playerId]) json[playerId] = [];
    
    json[playerId].push({ type: "coins", amount: amount });
    const ok = await saveRewardsJSON(json, sha);
    return msg.reply(ok ? `${amount} Saiyan Coins enviadas para ${playerId}!` : "Erro ao salvar no GitHub.");
  }
});

client.on("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
