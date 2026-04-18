import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder
} from "discord.js";
import Steckbrief from "../models/Steckbrief.js";

export const data = new SlashCommandBuilder()
  .setName("steckbrief-bearbeiten")
  .setDescription("Bearbeite einen deiner Steckbriefe.")
  .addStringOption(option =>
    option
      .setName("name")
      .setDescription("Name des Kaninchens")
      .setRequired(true)
  );

export async function execute(interaction, client) {
  const name = interaction.options.getString("name");
  const userId = interaction.user.id;

  // Steckbrief suchen
  const sb = await Steckbrief.findOne({ name, besitzer: userId });

  if (!sb) {
    return interaction.reply({
      content: `Du besitzt keinen Steckbrief mit dem Namen **${name}**.`,
      ephemeral: true
    });
  }

  // Auswahlmenü für Felder
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`feldwahl_${sb._id}`)
    .setPlaceholder("Welches Feld möchtest du bearbeiten?")
    .addOptions([
      { label: "Name", value: "name" },
      { label: "Geburtsdatum", value: "geburtsdatum" },
      { label: "Geschlecht", value: "geschlecht" },
      { label: "Gewicht", value: "gewicht" },
      { label: "Rasse", value: "rasse" },
      { label: "Aussehen", value: "aussehen" },
      { label: "Charakter", value: "charakter" },
      { label: "Krankheiten", value: "krankheiten" },
      { label: "Bild", value: "bild" },
      { label: "Sonstiges", value: "sonstiges" },
      { label: "Verstorben-Status ändern", value: "verstorben" }
    ]);

  const row = new ActionRowBuilder().addComponents(menu);

  return interaction.reply({
    content: "Wähle das Feld, das du bearbeiten möchtest.",
    components: [row],
    ephemeral: true
  });
}

// Button/Select Handler
export async function button() {}

// Select Menu Handler
export async function select(interaction, id) {
  const sb = await Steckbrief.findById(id);
  if (!sb) {
    return interaction.reply({
      content: "Dieser Steckbrief existiert nicht mehr.",
      ephemeral: true
    });
  }

  const feld = interaction.values[0];
  const userId = interaction.user.id;

  if (sb.besitzer !== userId) {
    return interaction.reply({
      content: "Du darfst diesen Steckbrief nicht bearbeiten.",
      ephemeral: true
    });
  }

  // Spezialfall: verstorben
  if (feld === "verstorben") {
    return frageVerstorben(interaction, sb);
  }

  // Normale Felder bearbeiten
  return frageNormalesFeld(interaction, sb, feld);
}

// Normale Felder bearbeiten
async function frageNormalesFeld(interaction, sb, feld) {
  await interaction.reply({
    content: `Bitte gib den neuen Wert für **${feld}** ein.`,
    ephemeral: true
  });

  const filter = m => m.author.id === interaction.user.id;
  const collected = await interaction.channel.awaitMessages({
    filter,
    max: 1,
    time: 120000
  });

  if (!collected.size) {
    return interaction.followUp({
      content: "Zeit abgelaufen.",
      ephemeral: true
    });
  }

  const neuerWert = collected.first().content;
  await collected.first().delete().catch(() => {});

  sb[feld] = neuerWert;
  sb.geaendertAm = new Date();
  await sb.save();

  // Kanalnachricht ersetzen
  if (sb.channelId && sb.messageId && !sb.verstorben) {
    try {
      const kanal = interaction.guild.channels.cache.get(sb.channelId);
      const alteNachricht = await kanal.messages.fetch(sb.messageId);

      const embed = erstelleEmbed(sb, interaction.user.username);
      const neueNachricht = await alteNachricht.edit({ embeds: [embed] });

      sb.messageId = neueNachricht.id;
      await sb.save();
    } catch (err) {
      console.error("Fehler beim Aktualisieren der Kanalnachricht:", err);
    }
  }

  return interaction.followUp({
    content: `Das Feld **${feld}** wurde erfolgreich aktualisiert.`,
    ephemeral: true
  });
}

// Verstorbene-Logik
async function frageVerstorben(interaction, sb) {
  await interaction.reply({
    content: "Ist das Kaninchen verstorben? (ja/nein)",
    ephemeral: true
  });

  const filter = m => m.author.id === interaction.user.id;
  const collected = await interaction.channel.awaitMessages({
    filter,
    max: 1,
    time: 120000
  });

  if (!collected.size) {
    return interaction.followUp({
      content: "Zeit abgelaufen.",
      ephemeral: true
    });
  }

  const antwort = collected.first().content.toLowerCase();
  await collected.first().delete().catch(() => {});

  if (antwort === "nein") {
    sb.verstorben = false;
    sb.todesdatum = "";
    sb.todesgrund = "";
    await sb.save();

    return interaction.followUp({
      content: "Status wurde auf **lebend** gesetzt.",
      ephemeral: true
    });
  }

  if (antwort !== "ja") {
    return interaction.followUp({
      content: "Ungültige Eingabe. Bitte nur 'ja' oder 'nein'.",
      ephemeral: true
    });
  }

  // Verstorbene Infos abfragen
  sb.verstorben = true;

  // Todesdatum
  await interaction.followUp({
    content: "Todesdatum? (optional, oder 'skip')",
    ephemeral: true
  });

  const d1 = await interaction.channel.awaitMessages({ filter, max: 1, time: 120000 });
  if (d1.size) {
    const val = d1.first().content;
    sb.todesdatum = val.toLowerCase() === "skip" ? "" : val;
    await d1.first().delete().catch(() => {});
  }

  // Todesgrund
  await interaction.followUp({
    content: "Todesgrund? (optional, oder 'skip')",
    ephemeral: true
  });

  const d2 = await interaction.channel.awaitMessages({ filter, max: 1, time: 120000 });
  if (d2.size) {
    const val = d2.first().content;
    sb.todesgrund = val.toLowerCase() === "skip" ? "" : val;
    await d2.first().delete().catch(() => {});
  }

  await sb.save();

  // Kanalnachricht löschen
  if (sb.channelId && sb.messageId) {
    try {
      const kanal = interaction.guild.channels.cache.get(sb.channelId);
      const msg = await kanal.messages.fetch(sb.messageId);
      await msg.delete();
      sb.messageId = "";
      await sb.save();
    } catch (err) {
      console.error("Fehler beim Löschen der Kanalnachricht:", err);
    }
  }

  return interaction.followUp({
    content: "Status wurde auf **verstorben** gesetzt.",
    ephemeral: true
  });
}

// Embed für Kanalnachricht
function erstelleEmbed(sb, username) {
  const embed = new EmbedBuilder()
    .setTitle(`🐰 Steckbrief: ${sb.name}`)
    .addFields(
      { name: "Geburtsdatum", value: sb.geburtsdatum },
      { name: "Geschlecht", value: sb.geschlecht },
      { name: "Gewicht", value: sb.gewicht || "—" },
      { name: "Rasse", value: sb.rasse || "—" },
      { name: "Aussehen", value: sb.aussehen || "—" },
      { name: "Charakter", value: sb.charakter || "—" },
      { name: "Krankheiten", value: sb.krankheiten || "—" },
      { name: "Sonstiges", value: sb.sonstiges || "—" }
    )
    .setFooter({ text: `Besitzer: ${username}` })
    .setTimestamp();

  if (sb.bild) embed.setImage(sb.bild);

  return embed;
}
