import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";
import Steckbrief from "../models/Steckbrief.js";

export const data = new SlashCommandBuilder()
  .setName("steckbrief-loeschen")
  .setDescription("Löscht einen deiner Steckbriefe.")
  .addStringOption(option =>
    option
      .setName("name")
      .setDescription("Name des Kaninchens")
      .setRequired(true)
  );

export async function execute(interaction) {
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

  // Sicherheitsabfrage
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`loeschenJA_${sb._id}`)
      .setLabel("Ja, löschen")
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(`loeschenNEIN_${sb._id}`)
      .setLabel("Abbrechen")
      .setStyle(ButtonStyle.Secondary)
  );

  return interaction.reply({
    content: `Bist du sicher, dass du den Steckbrief von **${name}** löschen möchtest?`,
    components: [row],
    ephemeral: true
  });
}

// Button Handler
export async function button(interaction, id) {
  const [aktion, sbId] = interaction.customId.split("_");

  const sb = await Steckbrief.findById(sbId);
  if (!sb) {
    return interaction.reply({
      content: "Dieser Steckbrief existiert nicht mehr.",
      ephemeral: true
    });
  }

  const userId = interaction.user.id;

  if (sb.besitzer !== userId) {
    return interaction.reply({
      content: "Du darfst diesen Steckbrief nicht löschen.",
      ephemeral: true
    });
  }

  // Abbrechen
  if (aktion === "loeschenNEIN") {
    return interaction.reply({
      content: "Löschen abgebrochen.",
      ephemeral: true
    });
  }

  // Löschen bestätigen
  if (aktion === "loeschenJA") {
    // Kanalnachricht löschen
    if (sb.channelId && sb.messageId) {
      try {
        const kanal = interaction.guild.channels.cache.get(sb.channelId);
        const msg = await kanal.messages.fetch(sb.messageId);
        await msg.delete();
      } catch (err) {
        console.error("Fehler beim Löschen der Kanalnachricht:", err);
      }
    }

    // DB-Eintrag löschen
    await Steckbrief.deleteOne({ _id: sb._id });

    return interaction.reply({
      content: `Der Steckbrief von **${sb.name}** wurde erfolgreich gelöscht.`,
      ephemeral: true
    });
  }
}
