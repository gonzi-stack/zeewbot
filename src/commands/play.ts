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
    .setName('play')
    .setDescription('Reproduce una canción o la agrega a la cola')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('URL de YouTube o texto para buscar')
        .setRequired(true),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction, client: IBot) {
    const member = interaction.member as GuildMember;

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

    const query = interaction.options.getString('query', true);
    await interaction.deferReply();

    try {
      // Resolver la query
      const tracks = await client.musicService.resolve(query);

      if (!tracks || tracks.length === 0) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error as `#${string}`)
              .setDescription('❌ No se encontraron resultados para tu búsqueda.'),
          ],
        });
        return;
      }

      const track = tracks[0];
      const guildId = interaction.guildId!;
      const channelId = member.voice?.channelId;
      if (!channelId) return;
      const textChannelId = interaction.channelId;

      // Verificar si ya hay algo reproduciéndose (para saber si es encolado o reproducido)
      const existingQueue = client.musicService.getQueue(guildId);
      const isQueued = existingQueue?.current !== null && existingQueue?.current !== undefined;

      // Agregar a la cola y reproducir
      await client.musicService.play(guildId, channelId, textChannelId, track);

      if (isQueued) {
        const duration = MusicService.formatDuration(track.info.length);
        const author = track.info.author || 'Desconocido';
        const position = existingQueue ? existingQueue.tracks.length : '?';

        const embed = new EmbedBuilder()
          .setColor(config.colors.primary as `#${string}`)
          .setAuthor({ name: '📋 Agregado a la cola' })
          .setDescription(
            `**[${track.info.title}](${track.info.uri ?? ''})**\n` +
            `${author} · \`${duration}\``,
          )
          .setFooter({ text: `#${position} en cola · ${member.displayName}` });

        if (track.info.artworkUrl) {
          embed.setThumbnail(track.info.artworkUrl);
        }

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.deleteReply();
      }
    } catch (error: unknown) {
      client.logger.error('Error en comando play:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error as `#${string}`)
            .setDescription(`❌ Error al reproducir: ${errorMsg}`),
        ],
      });
    }
  },
};
