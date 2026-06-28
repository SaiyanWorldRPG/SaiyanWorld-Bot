require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const axios = require("axios");

// ===============================
// CONFIGURAÇÕES DO BOT
// ===============================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ===============================
// CONFIGURAÇÕES DO SERVIDOR RAILWAY
// ===============================
// URL DIRETA E CORRETA DO SEU SERVIDOR
const RAILWAY_URL = "https://pokemon-rewards-production.up.railway.app/update";

// Log para garantir que a URL está correta
console.log("URL do servidor de recompensas:", RAILWAY_URL);

// Função para atualizar recompensas no Railway
async function updateRewards(playerId, reward) {
    try {
        console.log("Enviando recompensa para:", RAILWAY_URL);
        console.log("Payload:", { playerId, reward });

        await axios.post(RAILWAY_URL, {
            playerId,
            reward
        });

        console.log("Recompensa enviada com sucesso!");
        return true;
    } catch (err) {
        console.error("Erro ao atualizar recompensas:", err);
        return false;
    }
}

// ===============================
// EVENTO: BOT ONLINE
// ===============================
client.on("ready", () => {
    console.log(`Bot online como ${client.user.tag}`);
});

// ===============================
// EVENTO: MENSAGENS
// ===============================
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    // Comando de teste
    if (message.content === "!ping") {
        return message.reply("Pong!");
    }

    // ===============================
    // COMANDO !give
    // ===============================
    if (message.content.startsWith("!give")) {
        const args = message.content.split(" ");

        if (args.length < 5) {
            return message.reply("Uso correto: !give <PUBLIC_ID> item/pokemon <ITEM/ESPECIE> <QTD/NIVEL>");
        }

        const playerId = args[1];
        const type = args[2];

        // ITEM
        if (type === "item") {
            const item = args[3];
            const qty = parseInt(args[4]);

            const ok = await updateRewards(playerId, {
                type: "item",
                item: item,
                qty: qty
            });

            if (ok) {
                message.reply(`Item enviado para ${playerId}!`);
            } else {
                message.reply("Erro ao enviar recompensa.");
            }
        }

        // POKEMON
        if (type === "pokemon") {
            const species = args[3];
            const level = parseInt(args[4]);

            const ok = await updateRewards(playerId, {
                type: "pokemon",
                species: species,
                level: level
            });

            if (ok) {
                message.reply(`Pokémon enviado para ${playerId}!`);
            } else {
                message.reply("Erro ao enviar recompensa.");
            }
        }
    }
});

// ===============================
// LOGIN DO BOT
// ===============================
client.login(process.env.TOKEN);