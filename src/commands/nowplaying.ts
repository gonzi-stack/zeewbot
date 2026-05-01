import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { ICommand } from '../interfaces/ICommand';
import { IBot } from '../interfaces/IBot';
import { MusicService } from '../services/MusicService';
import config from '../../config.json';

export const command: ICommand = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Muestra la canción que se está reproduciendo'),

  async execute(interaction: ChatInputCommandInteraction, client: IBot) {
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

    const track = queue.current;
    const duration = MusicService.formatDuration(track.info.length);
    const author = track.info.author || 'Desconocido';
    const profile = client.musicService.getCurrentProfile(guildId);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary as `#${string}`)
      .setAuthor({ name: '♪ Reproduciendo' })
      .setDescription(
        `**[${track.info.title}](${track.info.uri ?? ''})**\n` +
        `${author} · \`${duration}\``,
      );

    if (track.info.artworkUrl) {
      embed.setThumbnail(track.info.artworkUrl);
    }

    // Footer con info de perfil y cola
    const footerParts: string[] = [];
    if (profile) {
      footerParts.push(profile.genreLabel);
    }
    if (queue.tracks.length > 0) {
      footerParts.push(`${queue.tracks.length} en cola`);
    }
    if (footerParts.length > 0) {
      embed.setFooter({ text: footerParts.join('  ·  ') });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
