import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import Steckbrief from "../models/Steckbrief.js";

export const data = new SlashCommandBuilder()
  .setName("steckbrief-anzeigen")
  .setDescription("Zeigt einen Steckbrief an.")
  .addStringOption(option =>
    option
      .setName("name")
      .setDescription("Name des Kaninchens")
      .setRequired(true)
  );

export async function execute(interaction) {
  const name = interaction.options.getString("name");

  // Alle Steckbriefe mit diesem Namen suchen
  const treffer = await Steckbrief.find({ name });

  if (treffer.length === 0) {
    return interaction.reply({
      content: `Kein Steckbrief mit dem Namen **${name}** gefunden.`,
      ephemeral: true
    });
  }

  // Wenn mehrere Besitzer denselben Namen haben → Buttons anzeigen
  if (treffer.length > 1) {
    const row = new ActionRowBuilder();

    treffer.forEach(sb => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`anzeigen_${sb._id}`)
          .setLabel(`Besitzer: ${sb.besitzer}`)
          .setStyle(ButtonStyle.Primary)
      );
    });

    return interaction.reply({
      content: `Es gibt mehrere Kaninchen mit dem Namen **${name}**. Wähle den Besitzer aus.`,
      components: [row],
      ephemeral: true
    });
  }

  // Wenn nur ein Treffer → direkt anzeigen
  return sendeSteckbrief(interaction, treffer[0]);
}

// Button-Handler
export async function button(interaction, id) {
  const steckbrief = await Steckbrief.findById(id);
  if (!steckbrief) {
    return interaction.reply({
      content: "Dieser Steckbrief existiert nicht mehr.",
      ephemeral: true
    });
  }

  return sendeSteckbrief(interaction, steckbrief);
}

// Funktion zum Anzeigen eines Steckbriefs
async function sendeSteckbrief(interaction, sb) {
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
    .setFooter({ text: `Besitzer: ${sb.besitzer}` })
    .setTimestamp();

  // Bild
  if (sb.bild) embed.setImage(sb.bild);

  // Verstorbene Tiere
  if (sb.verstorben === true) {
    embed.addFields({ name: "⚰️ Status", value: "Dieses Kaninchen ist verstorben." });

    if (sb.todesdatum) {
      embed.addFields({ name: "Todesdatum", value: sb.todesdatum });
    }

    if (sb.todesgrund) {
      embed.addFields({ name: "Grund", value: sb.todesgrund });
    }
  }

  return interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}
