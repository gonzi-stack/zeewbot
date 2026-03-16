import { Events } from 'discord.js';
import { IEvent } from '../interfaces/IEvent';
import { IBot } from '../interfaces/IBot';

export const event: IEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  
  execute(client: IBot) {
    client.logger.info(`✅ Bot iniciado como ${client.user?.tag}`);
    client.logger.info(`📊 Servidores: ${client.guilds.cache.size}`);
    client.logger.info(`👥 Usuarios: ${client.users.cache.size}`);
    
    // Establecer presencia
    client.user?.setPresence({
      activities: [{ 
        name: 'Zeew Space 🚀', 
        type: 3, // WATCHING
      }],
      status: 'online',
    });
  },
};
