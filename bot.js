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

// rewards.json está dentro de /docs
const filePath = "docs/rewards.json";

// -----------------------------------------------------------
// Baixar JSON
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
// Salvar JSON
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
// Comando !give
// -----------------------------------------------------------
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith("!give")) return;

  const args = msg.content.split(" ");
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

  msg.reply(ok ? `Recompensa enviada para ${playerId}!` : "Erro ao enviar recompensa.");
});

// -----------------------------------------------------------
// Webhook de limpeza — AGORA FUNCIONA
// -----------------------------------------------------------
client.on("messageCreate", async (msg) => {
  let payload = null;

  // 1. JSON puro
  try {
    if (msg.content.trim().startsWith("{")) {
      payload = JSON.parse(msg.content);
    }
  } catch {}

  // 2. Embed enviado pelo jogo
  if (!payload && msg.embeds.length > 0) {
    try {
      const embed = msg.embeds[0];
      if (embed.description && embed.description.trim().startsWith("{")) {
        payload = JSON.parse(embed.description);
      }
    } catch {}
  }

  // Se ainda não achou JSON, ignora
  if (!payload) return;

  // Verifica se é o webhook correto
  if (payload.type !== "clear_rewards") return;

  const playerId = payload.player_id;
  console.log("Webhook CLEAR recebido para:", playerId);

  const { json, sha } = await getRewardsJSON();

  if (json[playerId]) {
    delete json[playerId];
    console.log("Recompensas removidas com sucesso!");
  } else {
    console.log("ID não encontrado no JSON.");
  }

  await saveRewardsJSON(json, sha);
});

// -----------------------------------------------------------
// Bot online
// -----------------------------------------------------------
client.on("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);