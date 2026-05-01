import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags,
} from 'discord.js';
import { IBot } from '../interfaces/IBot';

/**
 * Valida que el usuario esté en el mismo canal de voz que el bot.
 * Responde automáticamente con un mensaje de error si la validación falla.
 * 
 * @returns true si la validación pasa (usuario está en el mismo VC), false si falla.
 */
export async function requireSameVoiceChannel(
  interaction: ChatInputCommandInteraction,
  client: IBot,
): Promise<boolean> {
  const member = interaction.member as GuildMember;

  // Verificar que el usuario esté en un canal de voz
  if (!member?.voice?.channel) {
    await interaction.reply({
      content: '❌ Debes estar en un canal de voz para usar este comando.',
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  // Verificar que el bot esté en un canal de voz y que sea el mismo
  const botMember = interaction.guild?.members.cache.get(client.user?.id ?? '');
  if (botMember?.voice?.channelId && member.voice.channelId !== botMember.voice.channelId) {
    await interaction.reply({
      content: '❌ Debes estar en el mismo canal de voz que el bot.',
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }

  return true;
}
