import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';
import config from '../../config.json';
import { requireSameVoiceChannel } from '../utils/voiceValidation';

export const command: ICommand = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Ajusta el volumen de reproducción')
    .addIntegerOption(option =>
      option
        .setName('nivel')
        .setDescription('Nivel de volumen (0-150)')
        .setMinValue(0)
        .setMaxValue(150)
        .setRequired(false),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction, client: IBot) {
    if (!(await requireSameVoiceChannel(interaction, client))) {
      return;
    }

    if (!client.musicService) {
      await interaction.reply({
        content: '❌ El servicio de música no está disponible.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guildId = interaction.guildId!;
    const queue = client.musicService.getQueue(guildId);

    if (!queue || !queue.current) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.info as `#${string}`)
            .setDescription('🔇 No hay nada reproduciéndose en este momento.'),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const level = interaction.options.getInteger('nivel');

    // Si no se proporcionó nivel, mostrar el volumen actual
    if (level === null) {
      const volumeBar = getVolumeBar(queue.volume);
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.primary as `#${string}`)
            .setDescription(`🔊 Volumen actual: **${queue.volume}%**\n${volumeBar}`),
        ],
      });
      return;
    }

    const newVolume = client.musicService.setVolume(guildId, level);
    if (newVolume === null) {
      await interaction.reply({
        content: '❌ No se pudo ajustar el volumen.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const icon = newVolume === 0 ? '🔇' : newVolume < 50 ? '🔉' : '🔊';
    const volumeBar = getVolumeBar(newVolume);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary as `#${string}`)
          .setDescription(`${icon} Volumen ajustado a **${newVolume}%**\n${volumeBar}`),
      ],
    });
  },
};

/**
 * Genera una barra visual de volumen
 */
function getVolumeBar(volume: number): string {
  const maxBars = 15;
  const filled = Math.round((volume / 150) * maxBars);
  const empty = maxBars - filled;
  return `\`[${'▰'.repeat(filled)}${'▱'.repeat(empty)}]\``;
}
