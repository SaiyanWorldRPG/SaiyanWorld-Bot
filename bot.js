// NÃO usar dotenv no Railway
const { Octokit } = require("@octokit/rest");
const axios = require("axios");
const fs = require("fs");

// Discord.js
const { Client, GatewayIntentBits } = require("discord.js");
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

// Dados do repositório
const owner = process.env.GITHUB_USER;
const repo = process.env.GITHUB_REPO;
const filePath = process.env.GITHUB_FILE_PATH;

// -----------------------------------------------------------
// Função: baixar o rewards.json do GitHub
// -----------------------------------------------------------
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

// -----------------------------------------------------------
// Função: salvar o rewards.json no GitHub
// -----------------------------------------------------------
async function saveRewardsJSON(newJSON, sha) {
  try {
    const contentEncoded = Buffer.from(JSON.stringify(newJSON, null, 2)).toString("base64");

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: "Atualizar recompensas",
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
// Comando: !give <playerId> pokemon CHARMANDER 15
// -----------------------------------------------------------
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith("!give")) return;

  const args = msg.content.split(" ");

  // Padroniza ID para 5 dígitos
  const rawId = args[1];
  const playerId = rawId.padStart(5, "0");

  const type = args[2];
  const species = args[3];
  const level = parseInt(args[4]);

  console.log(`Enviando recompensa para o jogador ${playerId}`);

  const { json, sha } = await getRewardsJSON();

  if (!json[playerId]) json[playerId] = [];

  json[playerId].push({
    type,
    species,
    level
  });

  const ok = await saveRewardsJSON(json, sha);

  if (ok) {
    msg.reply(`Recompensa enviada para o jogador ${playerId}!`);
  } else {
    msg.reply("Erro ao enviar recompensa.");
  }
});

// -----------------------------------------------------------
// Webhook: limpar recompensas após o jogo receber
// -----------------------------------------------------------
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith("{")) return; // só processa JSON

  try {
    const payload = JSON.parse(msg.content);

    if (payload.type !== "clear_rewards") return;

    const playerId = payload.player_id;

    console.log("Recebido CLEAR para:", playerId);

    const { json, sha } = await getRewardsJSON();

    if (json[playerId]) {
      delete json[playerId];
      console.log("Recompensas removidas com sucesso!");
    } else {
      console.log("ID não encontrado no JSON.");
    }

    await saveRewardsJSON(json, sha);

  } catch (err) {
    console.error("Erro ao processar webhook:", err);
  }
});

// -----------------------------------------------------------
// Bot online
// -----------------------------------------------------------
client.on("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

// Usa o token do Railway
client.login(process.env.DISCORD_TOKEN);