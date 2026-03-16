import { Events, Interaction } from 'discord.js';
import { IEvent } from '../interfaces/IEvent';
import { IBot } from '../interfaces/IBot';

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
    }
  },
};
