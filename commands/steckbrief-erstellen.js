import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Steckbrief from "../models/Steckbrief.js";

export const data = new SlashCommandBuilder()
  .setName("steckbrief-erstellen")
  .setDescription("Erstelle einen neuen Steckbrief für dein Kaninchen.");

export async function execute(interaction, client) {
  await interaction.reply({
    content: "Lass uns deinen Steckbrief erstellen. Ich stelle dir ein paar Fragen.",
    ephemeral: true
  });

  const fragen = [
    { key: "name", text: "Wie heißt dein Kaninchen? (Pflichtfeld)" },
    { key: "geburtsdatum", text: "Geburtsdatum? (Pflichtfeld)" },
    { key: "geschlecht", text: "Geschlecht? (Pflichtfeld)" },
    { key: "gewicht", text: "Gewicht? (optional)" },
    { key: "rasse", text: "Rasse? (optional)" },
    { key: "aussehen", text: "Aussehen? (optional)" },
    { key: "charakter", text: "Charakter? (optional)" },
    { key: "krankheiten", text: "Krankheiten? (optional)" },
    { key: "bild", text: "Bild-URL? (optional)" },
    { key: "sonstiges", text: "Sonstiges? (optional)" }
  ];

  const antworten = {};
  const filter = m => m.author.id === interaction.user.id;

  for (const frage of fragen) {
    await interaction.followUp({
      content: frage.text,
      ephemeral: true
    });

    const collected = await interaction.channel.awaitMessages({
      filter,
      max: 1,
      time: 120000
    });

    if (!collected.size) {
      return interaction.followUp({
        content: "Zeit abgelaufen. Vorgang abgebrochen.",
        ephemeral: true
      });
    }

    antworten[frage.key] = collected.first().content;
    await collected.first().delete().catch(() => {});
  }

  // Steckbrief speichern
  try {
    const neuerSteckbrief = await Steckbrief.create({
      ...antworten,
      besitzer: interaction.user.id,
      verstorben: false
    });

    // Embed erstellen
    const embed = new EmbedBuilder()
      .setTitle(`🐰 Steckbrief: ${neuerSteckbrief.name}`)
      .addFields(
        { name: "Geburtsdatum", value: neuerSteckbrief.geburtsdatum },
        { name: "Geschlecht", value: neuerSteckbrief.geschlecht },
        { name: "Gewicht", value: neuerSteckbrief.gewicht || "—" },
        { name: "Rasse", value: neuerSteckbrief.rasse || "—" },
        { name: "Aussehen", value: neuerSteckbrief.aussehen || "—" },
        { name: "Charakter", value: neuerSteckbrief.charakter || "—" },
        { name: "Krankheiten", value: neuerSteckbrief.krankheiten || "—" },
        { name: "Sonstiges", value: neuerSteckbrief.sonstiges || "—" }
      )
      .setFooter({ text: `Besitzer: ${interaction.user.username}` })
      .setTimestamp();

    if (neuerSteckbrief.bild) {
      embed.setImage(neuerSteckbrief.bild);
    }

    // Kanal finden
    const kanal = interaction.guild.channels.cache.find(
      c => c.name === "🐰】steckbriefe"
    );

    if (!kanal) {
      return interaction.followUp({
        content: "Fehler: Der Kanal 🐰】steckbriefe wurde nicht gefunden.",
        ephemeral: true
      });
    }

    // Nachricht posten
    const msg = await kanal.send({ embeds: [embed] });

    // Message-ID speichern
    neuerSteckbrief.messageId = msg.id;
    neuerSteckbrief.channelId = kanal.id;
    await neuerSteckbrief.save();

    await interaction.followUp({
      content: `Steckbrief von **${neuerSteckbrief.name}** erfolgreich erstellt.`,
      ephemeral: true
    });

  } catch (err) {
    console.error(err);
    return interaction.followUp({
      content: "Fehler: Möglicherweise existiert bereits ein Steckbrief mit diesem Namen.",
      ephemeral: true
    });
  }
}
