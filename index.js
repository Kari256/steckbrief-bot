import { Client, GatewayIntentBits, Collection } from "discord.js";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

// Bot erstellen
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Commands laden
client.commands = new Collection();
const commandsPath = path.join(process.cwd(), "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Slash Commands Handler
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: "Es gab einen Fehler.", ephemeral: true });
  }
});

// Login + MongoDB verbinden
const TOKEN = process.env.TOKEN;
const MONGO = process.env.MONGO;

client.once("ready", () => {
  console.log(`Bot ist online als ${client.user.tag}`);
});

mongoose.connect(MONGO).then(() => {
  console.log("Mit MongoDB verbunden.");
  client.login(TOKEN);
});
