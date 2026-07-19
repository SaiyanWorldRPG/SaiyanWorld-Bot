// NÃO usar dotenv no Railway
const { Octokit } = require("@octokit/rest");
const { Client, GatewayIntentBits } = require("discord.js");

// Discord.js
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
// Comando !give <playerId> <species> <level>
// -----------------------------------------------------------
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith("!give")) return;

  const args = msg.content.split(" ");

  const rawId = args[1];
  const playerId = rawId.padStart(5, "0");

  const species = args[2];
  const level = parseInt(args[3]);

  console.log(`Enviando Pokémon ${species} Nv.${level} para o jogador ${playerId}`);

  const { json, sha } = await getRewardsJSON();

  if (!json[playerId]) json[playerId] = [];

  json[playerId].push({
    type: "pokemon",
    species: species,
    level: level
  });

  const ok = await saveRewardsJSON(json, sha);

  msg.reply(ok ? `Pokémon ${species} Nv.${level} enviado para ${playerId}!` : "Erro ao enviar Pokémon.");
});

// -----------------------------------------------------------
// Comando !item <playerId> <item> <qty>
// -----------------------------------------------------------
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith("!item")) return;

  const args = msg.content.split(" ");

  const rawId = args[1];
  const playerId = rawId.padStart(5, "0");

  const item = args[2];
  const qty = parseInt(args[3]);

  console.log(`Enviando ${qty}x ${item} para o jogador ${playerId}`);

  const { json, sha } = await getRewardsJSON();

  if (!json[playerId]) json[playerId] = [];

  json[playerId].push({
    type: "item",
    item: item,
    qty: qty
  });

  const ok = await saveRewardsJSON(json, sha);

  msg.reply(ok ? `${qty}x ${item} enviados para ${playerId}!` : "Erro ao enviar item.");
});

// -----------------------------------------------------------
// Comando !coins <playerId> <quantidade>
// -----------------------------------------------------------
client.on("messageCreate", async (msg) => {
  if (!msg.content.startsWith("!coins")) return;

  const args = msg.content.split(" ");

  const rawId = args[1];
  const playerId = rawId.padStart(5, "0");

  const amount = parseInt(args[2]);

  console.log(`Enviando ${amount} Saiyan Coins para o jogador ${playerId}`);

  const { json, sha } = await getRewardsJSON();

  if (!json[playerId]) json[playerId] = [];

  json[playerId].push({
    type: "coins",
    amount: amount
  });

  const ok = await saveRewardsJSON(json, sha);

  msg.reply(ok ? `${amount} Saiyan Coins enviadas para ${playerId}!` : "Erro ao enviar Saiyan Coins.");
});

// -----------------------------------------------------------
// Bot online
// -----------------------------------------------------------
client.on("ready", () => {
  console.log(`Bot online como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);