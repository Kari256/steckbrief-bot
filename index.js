import { Client, GatewayIntentBits, Collection, Events } from "discord.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import url from "url";

// __dirname für ES Modules
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Discord Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Commands laden
client.commands = new Collection();
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ Command ${file} hat kein data/execute`);
  }
}

// Interaktionen verarbeiten
client.on(Events.InteractionCreate, async interaction => {
  // Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(error);
      if (!interaction.replied) {
        await interaction.reply({ content: "Es gab einen Fehler.", ephemeral: true });
      }
    }
  }

  // Buttons
  if (interaction.isButton()) {
    const [action, id] = interaction.customId.split("_");

    try {
      const handler = client.commands.get(action);
      if (handler && handler.button) {
        await handler.button(interaction, id, client);
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: "Fehler bei Button‑Interaktion.", ephemeral: true });
    }
  }
});

// Bot ready
client.once(Events.ClientReady, () => {
  console.log(`Bot ist online als ${client.user.tag}`);
});

// MongoDB + Login
const TOKEN = process.env.TOKEN;
const MONGO = process.env.MONGO;

mongoose.connect(MONGO)
  .then(() => {
    console.log("Mit MongoDB verbunden.");
    client.login(TOKEN);
  })
  .catch(err => console.error("MongoDB Fehler:", err));
