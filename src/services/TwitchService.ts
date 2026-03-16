import { IBot } from '../interfaces/IBot';
import config from '../../config.json';

interface TwitchStreamEvent {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  started_at: string;
}

interface TwitchSubscription {
  id: string;
  status: string;
  type: string;
  version: string;
}

interface TwitchTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TwitchUserResponse {
  data: Array<{
    id: string;
    login: string;
    display_name: string;
  }>;
}

export class TwitchService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private userIds: Map<string, string> = new Map();
  private liveStreams: Set<string> = new Set();

  constructor(
    private client: IBot,
    private webhookCallback: (event: TwitchStreamEvent, type: 'online' | 'offline') => void,
  ) {}

  public async initialize(): Promise<void> {
    if (!config.twitch.enabled) {
      this.client.logger.info('Twitch service is disabled');
      return;
    }

    this.client.logger.info('Initializing Twitch service...');

    try {
      await this.authenticate();

      await this.loadUserIds();

      await this.subscribeToEvents();

      this.client.logger.info('Twitch service initialized successfully');
    } catch (error) {
      this.client.logger.error('Failed to initialize Twitch service:', error);
    }
  }

  private async authenticate(): Promise<void> {
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.twitch.clientId,
        client_secret: config.twitch.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      throw new Error(`Twitch auth failed: ${response.status}`);
    }

    const data = (await response.json()) as TwitchTokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

    this.client.logger.info('Twitch authentication successful');
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  private async loadUserIds(): Promise<void> {
    const channels = config.twitch.channels;

    for (const channel of channels) {
      try {
        const userId = await this.getUserId(channel);
        if (userId) {
          this.userIds.set(channel.toLowerCase(), userId);
          this.client.logger.info(`Loaded Twitch user ID for ${channel}: ${userId}`);
        }
      } catch (error) {
        this.client.logger.error(`Failed to get user ID for ${channel}:`, error);
      }
    }
  }

  private async getUserId(username: string): Promise<string | null> {
    await this.ensureValidToken();

    const response = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
      headers: {
        'Client-ID': config.twitch.clientId,
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Twitch API error: ${response.status}`);
    }

    const data = (await response.json()) as TwitchUserResponse;
    return data.data[0]?.id ?? null;
  }

  private async subscribeToEvents(): Promise<void> {
    for (const [, userId] of this.userIds) {
      await this.createSubscription('stream.online', userId);
      await this.createSubscription('stream.offline', userId);
    }
  }

  private async createSubscription(type: string, userId: string): Promise<void> {
    await this.ensureValidToken();

    const callbackUrl = `https://${this.getWebhookDomain()}/twitch/webhook`;

    const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Client-ID': config.twitch.clientId,
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        version: '1',
        condition: { broadcaster_user_id: userId },
        transport: {
          method: 'webhook',
          callback: callbackUrl,
          secret: config.twitch.webhookSecret,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.client.logger.error(`Failed to create subscription for ${type}: ${error}`);
      return;
    }

    const data = (await response.json()) as { data: TwitchSubscription[] };
    const subscription = data.data[0];

    this.client.logger.info(`Created ${type} subscription: ${subscription?.id ?? 'unknown'}`);
  }

  private getWebhookDomain(): string {
    return process.env.TWITCH_WEBHOOK_DOMAIN || 'your-domain.com';
  }

  public async handleWebhookEvent(
    eventType: string,
    event: TwitchStreamEvent,
  ): Promise<void> {
    if (eventType === 'stream.online') {
      if (!this.liveStreams.has(event.broadcaster_user_id)) {
        this.liveStreams.add(event.broadcaster_user_id);
        this.client.logger.info(`${event.broadcaster_user_name} is now live!`);
        this.webhookCallback(event, 'online');
      }
    } else if (eventType === 'stream.offline') {
      if (this.liveStreams.has(event.broadcaster_user_id)) {
        this.liveStreams.delete(event.broadcaster_user_id);
        this.client.logger.info(`${event.broadcaster_user_name} is now offline`);
        this.webhookCallback(event, 'offline');
      }
    }
  }

  public getLiveStreams(): string[] {
    return Array.from(this.liveStreams);
  }

  public isStreamLive(username: string): boolean {
    const userId = this.userIds.get(username.toLowerCase());
    return userId ? this.liveStreams.has(userId) : false;
  }

  public getTrackedChannels(): string[] {
    return config.twitch.channels;
  }
}
