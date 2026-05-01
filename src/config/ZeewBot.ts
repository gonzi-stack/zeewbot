import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { IBot } from '../interfaces/IBot';
import { ICommand } from '../interfaces/ICommand';
import { Logger } from 'winston';
import config from '../../config.json';
import { WelcomeService } from '../services/WelcomeService';
import { TicketService } from '../services/TicketService';
import { TTSService } from '../services/TTSService';
import { MusicService } from '../services/MusicService';
import { TwitchService } from '../services/TwitchService';
import { TwitchWebhookServer } from '../utils/TwitchWebhookServer';
import { DatabaseService } from '../database/DatabaseService';

export class ZeewBot extends Client implements IBot {
  public commands: Collection<string, ICommand>;
  public logger: Logger;
  public welcomeService: WelcomeService;
  public ticketService: TicketService;
  public ttsService: TTSService;
  public musicService: MusicService;
  public twitchService: TwitchService;
  public twitchWebhookServer: TwitchWebhookServer;
  public database: DatabaseService;

  constructor(logger: Logger) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.Reaction,
      ],
    });

    this.commands = new Collection();
    this.logger = logger;

    this.welcomeService = new WelcomeService(this);
    this.ticketService = new TicketService(this);
    this.ttsService = new TTSService(this);
    this.musicService = new MusicService(this);
    this.database = new DatabaseService(process.env.REDIS_URL);

    this.twitchWebhookServer = new TwitchWebhookServer(logger, config.twitch.webhookPort);
    this.twitchService = new TwitchService(this, this.handleStreamEvent.bind(this));

  }

  private async handleStreamEvent(
    event: { broadcaster_user_id: string; broadcaster_user_login: string; broadcaster_user_name: string; started_at?: string },
    type: 'online' | 'offline',
  ): Promise<void> {
    if (!config.twitch.announceChannelId) {
      this.logger.warn('Twitch announce channel not configured');
      return;
    }

    const channel = await this.channels.fetch(config.twitch.announceChannelId);
    if (!channel || !channel.isTextBased() || channel.isDMBased()) {
      this.logger.error('Twitch announce channel not found or is not text-based');
      return;
    }

    if (type === 'online') {
      const embed = {
        color: 0x6441a5,
        title: `🔴 ${event.broadcaster_user_name} está en directo!`,
        description: `¡${event.broadcaster_user_name} ha comenzado a transmitir en Twitch!`,
        url: `https://www.twitch.tv/${event.broadcaster_user_login}`,
        timestamp: event.started_at || new Date().toISOString(),
        footer: {
          text: 'Zeew Space',
        },
      };

      await channel.send({ embeds: [embed] });
      this.logger.info(`Stream announcement sent for ${event.broadcaster_user_name}`);
    } else {
      const embed = {
        color: 0x6441a5,
        title: `⚫ ${event.broadcaster_user_name} está offline`,
        description: `${event.broadcaster_user_name} ha terminado su transmisión.`,
        footer: {
          text: 'Zeew Space',
        },
      };

      await channel.send({ embeds: [embed] });
      this.logger.info(`Offline announcement sent for ${event.broadcaster_user_name}`);
    }
  }

  public async start(token: string): Promise<void> {
    try {
      await this.database.connect();

      await this.login(token);
    } catch (error) {
      this.logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }

  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down bot...');

    this.welcomeService.cleanup();
    this.ttsService.cleanup();
    this.musicService.cleanup();
    this.twitchWebhookServer.stop();

    await this.database.disconnect();

    this.destroy();

    this.logger.info('Bot shut down successfully');
  }
}
