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
    .setName('equalizer')
    .setDescription('Activa o desactiva el ecualizador automático'),

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

    await interaction.deferReply();

    try {
      const eqEnabled = await client.musicService.toggleEqualizer(guildId);

      if (eqEnabled === null) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(config.colors.error as `#${string}`)
              .setDescription('❌ No se pudo cambiar el ecualizador.'),
          ],
        });
        return;
      }

      const profile = client.musicService.getCurrentProfile(guildId);

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary as `#${string}`)
        .setTitle(eqEnabled ? '🎛️ Ecualizador Automático Activado' : '🎛️ Ecualizador Desactivado');

      if (eqEnabled && profile) {
        embed.setDescription(
          `✅ Perfil auto-detectado: **${profile.genreLabel}**\n` +
          `Ajuste de volumen por fuente: **×${Math.round(profile.sourceAdjust * 100)}%**\n\n` +
          '> El EQ se adaptará automáticamente a cada canción.',
        );
      } else if (eqEnabled) {
        embed.setDescription(
          '✅ Ecualizador automático activado.\n' +
          '> Se adaptará al género de cada canción.',
        );
      } else {
        embed.setDescription(
          '⬛ Ecualizador desactivado.\nReproducción con sonido plano (sin procesamiento de EQ).\n\n' +
          '> La corrección de volumen por fuente sigue activa.',
        );
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error: unknown) {
      client.logger.error('Error en comando equalizer:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.colors.error as `#${string}`)
            .setDescription('❌ Error al cambiar el ecualizador.'),
        ],
      });
    }
  },
};
