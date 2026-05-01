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
    .setName('queue')
    .setDescription('Muestra la cola de reproducción actual'),

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
            .setDescription('📭 La cola de reproducción está vacía.'),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Track actual
    const current = queue.current;
    const currentDuration = MusicService.formatDuration(current.info.length);

    let description =
      `**♪ Ahora**\n` +
      `[${current.info.title}](${current.info.uri ?? ''}) · \`${currentDuration}\`\n`;

    // Próximos tracks (máximo 10)
    if (queue.tracks.length > 0) {
      const upcoming = queue.tracks
        .slice(0, 10)
        .map((track, i) => {
          const dur = MusicService.formatDuration(track.info.length);
          return `\`${i + 1}.\` [${track.info.title}](${track.info.uri ?? ''}) · \`${dur}\``;
        })
        .join('\n');

      description += `\n**Siguiente**\n${upcoming}`;

      if (queue.tracks.length > 10) {
        description += `\n*...y ${queue.tracks.length - 10} más*`;
      }
    }

    // Duración total
    const totalMs = queue.tracks.reduce((acc, t) => acc + t.info.length, 0)
      + (current.info.length ?? 0);
    const totalDuration = MusicService.formatDuration(totalMs);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary as `#${string}`)
      .setAuthor({ name: '♪ Cola de Reproducción' })
      .setDescription(description)
      .setFooter({ text: `${queue.tracks.length + 1} canciones · ${totalDuration} total` });

    const isButton = 'isButton' in interaction && (interaction as any).isButton();
    
    await interaction.reply({ 
      embeds: [embed], 
      flags: isButton ? MessageFlags.Ephemeral : undefined,
    });
  },
};
