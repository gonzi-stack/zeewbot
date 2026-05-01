import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  MessageFlags,
} from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';
import { MusicService } from '../services/MusicService';
import config from '../../config.json';
import { requireSameVoiceChannel } from '../utils/voiceValidation';

export const command: ICommand = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Salta la canción actual'),

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
        content: '❌ No hay nada reproduciéndose.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const skippedTitle = queue.current.info.title;
    await client.musicService.skip(guildId);

    const newQueue = client.musicService.getQueue(guildId);
    let desc = `⏭️ **${skippedTitle}**`;
    if (newQueue?.current) {
      desc += `\n♪ Siguiente → **${newQueue.current.info.title}**`;
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning as `#${string}`)
      .setDescription(desc);

    await interaction.reply({ embeds: [embed] });
  },
};
