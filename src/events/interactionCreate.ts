import { Events, Interaction } from 'discord.js';
import { IEvent } from '../interfaces/IEvent';
import { IBot } from '../interfaces/IBot';
import { getMusicActionRow } from '../services/MusicService';

export const event: IEvent<Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  
  async execute(client: IBot, interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      
      if (!command) {
        client.logger.warn(`Command not found: ${interaction.commandName}`);
        return;
      }
      
      try {
        await command.execute(interaction, client);
      } catch (error) {
        client.logger.error(`Error executing command ${interaction.commandName}:`, error);
        
        const reply = {
          content: '❌ Hubo un error al ejecutar este comando.',
          ephemeral: true,
        };
        
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      }
    } else if (interaction.isButton()) {
      // Manejar botones de tickets
      const ticketService = (client as any).ticketService;
      
      if (interaction.customId === 'close_ticket') {
        try {
          await interaction.deferReply({ ephemeral: true });
          
          const member = interaction.member;
          if (!member || typeof member === 'string') {
            await interaction.editReply('❌ No se pudo obtener tu información.');
            return;
          }
          
          await ticketService.closeTicket(interaction.channelId, member);
        } catch (error: any) {
          await interaction.editReply(`❌ Error: ${error.message}`);
        }
      } else if (interaction.customId === 'claim_ticket') {
        await interaction.reply({
          content: `📌 ${interaction.user} ha reclamado este ticket.`,
          ephemeral: false,
        });
      }

      // Manejar botones de música
      if (interaction.customId.startsWith('music_')) {
        const guildId = interaction.guildId;
        if (!guildId || !interaction.guild) return;
        
        const musicService = client.musicService;
        if (!musicService) {
          await interaction.reply({ content: '❌ El servicio de música no está disponible.', ephemeral: true });
          return;
        }

        // Validar que el usuario esté en el mismo canal de voz que el bot
        const member = interaction.guild.members.cache.get(interaction.user.id);
        const botVoiceChannel = interaction.guild.members.cache.get(client.user?.id ?? '')?.voice?.channelId;
        const userVoiceChannel = member?.voice?.channelId;

        if (!userVoiceChannel) {
          await interaction.reply({ content: '❌ Debes estar en un canal de voz.', ephemeral: true });
          return;
        }

        if (botVoiceChannel && userVoiceChannel !== botVoiceChannel) {
          await interaction.reply({ content: '❌ Debes estar en el mismo canal de voz que el bot.', ephemeral: true });
          return;
        }

        const queue = musicService.getQueue(guildId);
        if (!queue || !queue.current) {
          await interaction.reply({ content: '❌ No hay nada reproduciéndose.', ephemeral: true });
          return;
        }

        if (interaction.customId === 'music_pause') {
          const isPaused = musicService.togglePause(guildId);
          await interaction.update({ components: [getMusicActionRow(isPaused)] });
        } else if (interaction.customId === 'music_skip') {
          musicService.skip(guildId);
          await interaction.reply({ content: '⏭️ Canción saltada.', ephemeral: true });
        } else if (interaction.customId === 'music_stop') {
          await musicService.stop(guildId);
          await interaction.reply({ content: '⏹️ Reproducción detenida.', ephemeral: true });
        } else if (interaction.customId === 'music_queue') {
          const command = client.commands.get('queue');
          if (command) {
            await command.execute(interaction as any, client);
          } else {
            await interaction.reply({ content: '❌ Comando no encontrado.', ephemeral: true });
          }
        }
      }
    }
  },
};
