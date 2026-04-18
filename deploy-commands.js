import { REST, Routes } from "discord.js";
import fs from "fs";
import path from "path";
import url from "url";

// __dirname für ES Modules
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ENV Variablen
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID; // Discord Bot Application ID
const GUILD_ID = process.env.GUILD_ID;   // Server ID

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("Fehler: TOKEN, CLIENT_ID oder GUILD_ID fehlen in den Environment Variablen.");
  process.exit(1);
}

// Commands laden
const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if (command.data) {
    commands.push(command.data.toJSON());
  }
}

// REST Client
const rest = new REST({ version: "10" }).setToken(TOKEN);

// Deploy
(async () => {
  try {
    console.log("🔄 Registriere Slash-Commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash-Commands erfolgreich registriert!");
  } catch (error) {
    console.error("❌ Fehler beim Registrieren der Commands:", error);
  }
})();
