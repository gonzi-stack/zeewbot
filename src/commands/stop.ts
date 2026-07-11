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
    .setName('stop')
    .setDescription('Detiene la reproducción y desconecta del canal de voz'),

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

    if (!queue) {
      await interaction.reply({
        content: '❌ No hay nada reproduciéndose.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await client.musicService.stop(guildId);

    const embed = new EmbedBuilder()
      .setColor(config.colors.error as `#${string}`)
      .setDescription('⏹️ Reproducción detenida y cola limpiada. ¡Hasta la próxima! 👋');

    await interaction.reply({ embeds: [embed] });
  },
};
