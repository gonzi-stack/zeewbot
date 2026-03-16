import { 
  GuildMember, 
  TextChannel, 
  ChannelType, 
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  CategoryChannel,
} from 'discord.js';
import { IBot } from '../interfaces/IBot';
import config from '../../config.json';

interface Ticket {
  id: string;
  userId: string;
  channelId: string;
  createdAt: Date;
  closed: boolean;
}

export class TicketService {
  private tickets: Map<string, Ticket> = new Map();
  private userTicketCount: Map<string, number> = new Map();

  constructor(private client: IBot) {}

  public async createTicket(member: GuildMember, reason?: string): Promise<TextChannel | null> {
    const userId = member.id;
    const guild = member.guild;

    // Verificar límite de tickets
    const userTickets = this.getUserOpenTickets(userId);
    if (userTickets >= config.tickets.maxOpenPerUser) {
      throw new Error(`Ya tienes ${config.tickets.maxOpenPerUser} tickets abiertos.`);
    }

    const ticketCategory = guild.channels.cache.get(config.channels.tickets) as CategoryChannel;
    if (!ticketCategory) {
      throw new Error('La categoría de tickets no está configurada.');
    }

    try {
      // Crear canal de ticket
      const ticketNumber = Date.now().toString(36);
      const ticketChannel = await guild.channels.create({
        name: `ticket-${member.user.username}-${ticketNumber}`,
        type: ChannelType.GuildText,
        parent: ticketCategory.id,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
          {
            id: config.roles.support,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
        ],
      });

      // Guardar información del ticket
      const ticket: Ticket = {
        id: ticketNumber,
        userId: member.id,
        channelId: ticketChannel.id,
        createdAt: new Date(),
        closed: false,
      };
      this.tickets.set(ticketChannel.id, ticket);
      this.incrementUserTicketCount(userId);

      // Crear embed de bienvenida
      const welcomeEmbed = new EmbedBuilder()
        .setColor(config.colors.primary as any)
        .setTitle('🎫 Ticket de Soporte')
        .setDescription(`¡Hola ${member}! Gracias por contactar con el soporte de Zeew Space.\n\n${reason ? `**Motivo:** ${reason}\n\n` : ''}Un miembro del equipo te atenderá pronto.`)
        .addFields(
          { name: '📋 Mientras esperas', value: 'Por favor, describe tu problema o pregunta con el mayor detalle posible.' },
          { name: '⏰ Tiempo de respuesta', value: 'Normalmente respondemos en menos de 24 horas.' },
        )
        .setTimestamp()
        .setFooter({ text: `Ticket ID: ${ticketNumber}` });

      // Crear botones
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('🔒 Cerrar Ticket')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('claim_ticket')
            .setLabel('📌 Reclamar Ticket')
            .setStyle(ButtonStyle.Primary),
        );

      await ticketChannel.send({
        content: `${member} | <@&${config.roles.support}>`,
        embeds: [welcomeEmbed],
        components: [row],
      });

      this.client.logger.info(`Ticket created: ${ticketNumber} for user ${member.user.tag}`);
      
      // Programar cierre por inactividad
      this.scheduleInactivityClose(ticketChannel.id);

      return ticketChannel;
    } catch (error) {
      this.client.logger.error(`Failed to create ticket: ${error}`);
      throw error;
    }
  }

  public async closeTicket(channelId: string, closedBy: GuildMember): Promise<void> {
    const ticket = this.tickets.get(channelId);
    if (!ticket || ticket.closed) {
      throw new Error('Ticket no encontrado o ya cerrado.');
    }

    const channel = this.client.channels.cache.get(channelId) as TextChannel;
    if (!channel) {
      throw new Error('Canal de ticket no encontrado.');
    }

    try {
      // Marcar como cerrado
      ticket.closed = true;
      this.decrementUserTicketCount(ticket.userId);

      // Crear transcripción
      const messages = await this.createTranscript(channel);
      
      // Enviar transcripción
      const transcriptChannel = channel.guild.channels.cache.get(config.tickets.transcriptChannel) as TextChannel;
      if (transcriptChannel && messages.length > 0) {
        const transcriptEmbed = new EmbedBuilder()
          .setColor(config.colors.info as any)
          .setTitle(`📄 Transcripción del Ticket #${ticket.id}`)
          .setDescription(`**Usuario:** <@${ticket.userId}>\n**Cerrado por:** ${closedBy}\n**Duración:** ${this.formatDuration(ticket.createdAt, new Date())}`)
          .addFields(
            { name: '📊 Estadísticas', value: `Mensajes: ${messages.length}` },
          )
          .setTimestamp();

        await transcriptChannel.send({
          embeds: [transcriptEmbed],
          files: [{
            attachment: Buffer.from(messages.join('\n'), 'utf-8'),
            name: `transcript-${ticket.id}.txt`,
          }],
        });
      }

      // Eliminar canal después de 5 segundos
      await channel.send('🔒 Este ticket se cerrará en 5 segundos...');
      setTimeout(() => {
        channel.delete().catch(err => {
          this.client.logger.error(`Failed to delete ticket channel: ${err}`);
        });
      }, 5000);

      this.tickets.delete(channelId);
      this.client.logger.info(`Ticket closed: ${ticket.id} by ${closedBy.user.tag}`);
    } catch (error) {
      this.client.logger.error(`Failed to close ticket: ${error}`);
      throw error;
    }
  }

  private async createTranscript(channel: TextChannel): Promise<string[]> {
    const messages: string[] = [];
    let lastId: string | undefined;

    try {
      while (true) {
        const fetchedMessages = await channel.messages.fetch({
          limit: 100,
          ...(lastId && { before: lastId }),
        });

        if (fetchedMessages.size === 0) break;

        fetchedMessages.forEach(msg => {
          const timestamp = msg.createdAt.toISOString();
          const author = `${msg.author.tag} (${msg.author.id})`;
          const content = msg.content || '[Sin contenido]';
          const attachments = msg.attachments.size > 0 
            ? `[${msg.attachments.size} archivo(s) adjunto(s)]` 
            : '';
          
          messages.push(`[${timestamp}] ${author}: ${content} ${attachments}`);
        });

        lastId = fetchedMessages.last()?.id;
      }
    } catch (error) {
      this.client.logger.error(`Failed to create transcript: ${error}`);
    }

    return messages.reverse();
  }

  private scheduleInactivityClose(channelId: string): void {
    setTimeout(async () => {
      const ticket = this.tickets.get(channelId);
      if (ticket && !ticket.closed) {
        const channel = this.client.channels.cache.get(channelId) as TextChannel;
        if (channel) {
          try {
            const guild = channel.guild;
            const botMember = guild.members.cache.get(this.client.user!.id);
            if (botMember) {
              await this.closeTicket(channelId, botMember);
            }
          } catch (error) {
            this.client.logger.error(`Failed to auto-close ticket: ${error}`);
          }
        }
      }
    }, config.tickets.inactivityClose);
  }

  private getUserOpenTickets(userId: string): number {
    return this.userTicketCount.get(userId) || 0;
  }

  private incrementUserTicketCount(userId: string): void {
    const current = this.userTicketCount.get(userId) || 0;
    this.userTicketCount.set(userId, current + 1);
  }

  private decrementUserTicketCount(userId: string): void {
    const current = this.userTicketCount.get(userId) || 0;
    if (current > 0) {
      this.userTicketCount.set(userId, current - 1);
    }
  }

  private formatDuration(start: Date, end: Date): string {
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  public getTicketByChannelId(channelId: string): Ticket | undefined {
    return this.tickets.get(channelId);
  }
}
