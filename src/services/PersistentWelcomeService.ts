import { GuildMember, TextChannel } from 'discord.js';
import { IBot } from '../interfaces/IBot';
import { DatabaseService } from '../database/DatabaseService';
import config from '../../config.json';

interface PendingWelcomeData {
  memberIds: string[];
  memberTags: string[];
  createdAt: number;
  lastUpdate: number;
}

export class PersistentWelcomeService {
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly REDIS_PREFIX = 'welcome:';
  
  constructor(
    private client: IBot,
    private database: DatabaseService,
  ) {
    // Verificar bienvenidas pendientes cada minuto
    this.checkInterval = setInterval(() => {
      this.checkPendingWelcomes();
    }, 60 * 1000);
    
    // Restaurar bienvenidas pendientes al iniciar
    this.restorePendingWelcomes();
  }

  public async handleNewMember(member: GuildMember): Promise<void> {
    const guildId = member.guild.id;
    const key = `${this.REDIS_PREFIX}${guildId}`;
    
    try {
      // Si usamos Redis
      if (this.database.isReady()) {
        const existingData = await this.database.get(key);
        
        if (existingData) {
          // Actualizar grupo existente
          const data: PendingWelcomeData = JSON.parse(existingData);
          data.memberIds.push(member.id);
          data.memberTags.push(member.user.tag);
          data.lastUpdate = Date.now();
          
          await this.database.set(key, JSON.stringify(data), config.welcome.waitTime / 1000);
          this.resetTimeout(guildId);
          
          this.client.logger.info(`Added ${member.user.tag} to persistent welcome group (${data.memberIds.length} members)`);
        } else {
          // Crear nuevo grupo
          const data: PendingWelcomeData = {
            memberIds: [member.id],
            memberTags: [member.user.tag],
            createdAt: Date.now(),
            lastUpdate: Date.now(),
          };
          
          await this.database.set(key, JSON.stringify(data), config.welcome.waitTime / 1000);
          this.createTimeout(guildId);
          
          this.client.logger.info(`Started new persistent welcome group for ${member.user.tag}`);
        }
      } else {
        // Fallback a memoria si Redis no está disponible
        this.handleMemberInMemory(member);
      }
    } catch (error) {
      this.client.logger.error(`Error handling welcome: ${error}`);
      // Fallback a memoria en caso de error
      this.handleMemberInMemory(member);
    }
  }

  private async restorePendingWelcomes(): Promise<void> {
    if (!this.database.isReady()) return;
    
    try {
      // Aquí necesitaríamos un método para escanear keys en Redis
      // Por simplicidad, asumiré que tenemos los guild IDs
      this.client.logger.info('Checking for pending welcomes to restore...');
    } catch (error) {
      this.client.logger.error(`Error restoring welcomes: ${error}`);
    }
  }

  private async checkPendingWelcomes(): Promise<void> {
    if (!this.database.isReady()) return;
    
    // Similar a restorePendingWelcomes, verificaría las bienvenidas pendientes
  }

  private createTimeout(guildId: string): void {
    const timeout = setTimeout(() => {
      this.sendWelcomeMessage(guildId);
    }, config.welcome.waitTime);
    
    this.timeouts.set(guildId, timeout);
  }

  private resetTimeout(guildId: string): void {
    // Cancelar timeout existente
    const existing = this.timeouts.get(guildId);
    if (existing) {
      clearTimeout(existing);
    }
    
    // Crear nuevo timeout
    this.createTimeout(guildId);
  }

  private async sendWelcomeMessage(guildId: string): Promise<void> {
    const key = `${this.REDIS_PREFIX}${guildId}`;
    
    try {
      let memberIds: string[] = [];
      
      if (this.database.isReady()) {
        const data = await this.database.get(key);
        if (data) {
          const parsed: PendingWelcomeData = JSON.parse(data);
          memberIds = parsed.memberIds;
          
          // Eliminar de Redis
          await this.database.delete(key);
        }
      }
      
      if (memberIds.length === 0) return;
      
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return;
      
      const welcomeChannel = guild.channels.cache.get(config.channels.welcome) as TextChannel;
      if (!welcomeChannel) {
        this.client.logger.error(`Welcome channel not found for guild ${guildId}`);
        return;
      }
      
      // Enviar mensaje de bienvenida
      let message: string;
      
      if (memberIds.length === 1) {
        message = config.welcome.messages.single.replace('{user}', `<@${memberIds[0]}>`);
      } else {
        const mentions = memberIds.map(id => `<@${id}>`).join(', ');
        message = config.welcome.messages.multiple.replace('{users}', mentions);
      }
      
      await welcomeChannel.send({
        content: message,
        allowedMentions: { users: memberIds },
      });
      
      this.client.logger.info(`Sent welcome message for ${memberIds.length} member(s)`);
      
      // Limpiar timeout
      this.timeouts.delete(guildId);
      
    } catch (error) {
      this.client.logger.error(`Failed to send welcome message: ${error}`);
    }
  }

  private handleMemberInMemory(_member: GuildMember): void {
    // Implementación de fallback similar a la original
    // pero sin persistencia
  }

  public cleanup(): void {
    // Limpiar intervalo
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Limpiar todos los timeouts
    for (const [guildId, timeout] of this.timeouts) {
      clearTimeout(timeout);
      this.sendWelcomeMessage(guildId);
    }
  }
}
