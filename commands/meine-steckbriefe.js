import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Steckbrief from "../models/Steckbrief.js";

export const data = new SlashCommandBuilder()
  .setName("meine-steckbriefe")
  .setDescription("Zeigt alle Steckbriefe an, die dir gehören.");

export async function execute(interaction) {
  const userId = interaction.user.id;

  // Steckbriefe des Users suchen
  const liste = await Steckbrief.find({ besitzer: userId });

  if (liste.length === 0) {
    return interaction.reply({
      content: "Du hast noch keine Steckbriefe erstellt.",
      ephemeral: true
    });
  }

  // Embed erstellen
  const embed = new EmbedBuilder()
    .setTitle(`🐰 Deine Steckbriefe (${liste.length})`)
    .setDescription(
      liste
        .map(sb => {
          let zeile = `• **${sb.name}**`;

          if (sb.verstorben) {
            zeile += " ⚰️";
          }

          return zeile;
        })
        .join("\n")
    )
    .setFooter({ text: `Besitzer: ${interaction.user.username}` })
    .setTimestamp();

  return interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}
