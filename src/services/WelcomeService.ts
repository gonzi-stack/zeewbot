import { GuildMember, TextChannel } from 'discord.js';
import { IBot } from '../interfaces/IBot';
import config from '../../config.json';

interface PendingWelcome {
  members: GuildMember[];
  timeout: NodeJS.Timeout;
  createdAt: number;
  lastUpdate: number;
}

export class WelcomeService {
  private pendingWelcomes: Map<string, PendingWelcome> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private client: IBot) {
    // Limpiar timeouts antiguos cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldWelcomes();
    }, 5 * 60 * 1000);
  }

  public async handleNewMember(member: GuildMember): Promise<void> {
    const guildId = member.guild.id;
    
    if (this.pendingWelcomes.has(guildId)) {
      // Agregar al grupo existente
      const pending = this.pendingWelcomes.get(guildId)!;
      pending.members.push(member);
      
      // Reiniciar el temporizador
      clearTimeout(pending.timeout);
      pending.timeout = this.createTimeout(guildId);
      pending.lastUpdate = Date.now();
      
      this.client.logger.info(`Added ${member.user.tag} to pending welcome group (${pending.members.length} members)`);
    } else {
      // Crear nuevo grupo
      const timeout = this.createTimeout(guildId);
      this.pendingWelcomes.set(guildId, {
        members: [member],
        timeout,
        createdAt: Date.now(),
        lastUpdate: Date.now(),
      });
      
      this.client.logger.info(`Started new welcome group for ${member.user.tag}`);
    }
  }

  private createTimeout(guildId: string): NodeJS.Timeout {
    return setTimeout(() => {
      this.sendWelcomeMessage(guildId);
    }, config.welcome.waitTime);
  }

  private async sendWelcomeMessage(guildId: string): Promise<void> {
    const pending = this.pendingWelcomes.get(guildId);
    if (!pending || pending.members.length === 0) return;

    const guild = this.client.guilds.cache.get(guildId);
    if (!guild) return;

    const welcomeChannel = guild.channels.cache.get(config.channels.welcome) as TextChannel;
    if (!welcomeChannel) {
      this.client.logger.error(`Welcome channel not found for guild ${guildId}`);
      return;
    }

    try {
      let message: string;
      
      if (pending.members.length === 1) {
        // Mensaje individual
        message = config.welcome.messages.single.replace('{user}', pending.members[0].toString());
      } else {
        // Mensaje múltiple
        const userMentions = pending.members.map(m => m.toString()).join(', ');
        message = config.welcome.messages.multiple.replace('{users}', userMentions);
      }

      // Reemplazar placeholders de canales
      message = message
        .replace('<#RULES_CHANNEL>', '<#CHANNEL_ID>') // Reemplazar con IDs reales
        .replace('<#INTROS_CHANNEL>', '<#CHANNEL_ID>')
        .replace('<#ROLES_CHANNEL>', '<#CHANNEL_ID>');

      await welcomeChannel.send({
        content: message,
        allowedMentions: { users: pending.members.map(m => m.id) },
      });

      // Asignar rol de miembro si está configurado
      if (config.roles.member) {
        for (const member of pending.members) {
          try {
            await member.roles.add(config.roles.member);
          } catch (error) {
            this.client.logger.error(`Failed to add member role to ${member.user.tag}: ${error}`);
          }
        }
      }

      this.client.logger.info(`Sent welcome message for ${pending.members.length} member(s)`);
    } catch (error) {
      this.client.logger.error(`Failed to send welcome message: ${error}`);
    } finally {
      // Limpiar el grupo
      this.pendingWelcomes.delete(guildId);
    }
  }

  private cleanupOldWelcomes(): void {
    const now = Date.now();
    const maxAge = config.welcome.waitTime * 2; // Doble del tiempo de espera como máximo
    
    for (const [guildId, pending] of this.pendingWelcomes) {
      if (now - pending.createdAt > maxAge) {
        this.client.logger.warn(`Cleaning up stale welcome for guild ${guildId}`);
        clearTimeout(pending.timeout);
        this.pendingWelcomes.delete(guildId);
      }
    }
  }

  public cleanup(): void {
    // Limpiar el intervalo de limpieza
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Limpiar todos los timeouts pendientes
    for (const [guildId, pending] of this.pendingWelcomes) {
      clearTimeout(pending.timeout);
      this.sendWelcomeMessage(guildId);
    }
  }

  public getStatus(): { guildId: string; memberCount: number; waitingTime: number }[] {
    const status = [];
    const now = Date.now();
    
    for (const [guildId, pending] of this.pendingWelcomes) {
      status.push({
        guildId,
        memberCount: pending.members.length,
        waitingTime: now - pending.lastUpdate,
      });
    }
    
    return status;
  }
}
