import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Logger } from 'winston';
import crypto from 'crypto';
import config from '../../config.json';

interface TwitchStreamEvent {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  started_at: string;
}

interface TwitchWebhookPayload {
  subscription: {
    type: string;
    status: string;
  };
  event: TwitchStreamEvent;
}

type WebhookHandler = (event: TwitchStreamEvent, type: 'online' | 'offline') => void;

export class TwitchWebhookServer {
  private server: ReturnType<typeof createServer> | null = null;
  private webhookHandler: WebhookHandler | null = null;

  constructor(
    private logger: Logger,
    private port: number = 3000,
  ) {}

  public setWebhookHandler(handler: WebhookHandler): void {
    this.webhookHandler = handler;
  }

  public start(): void {
    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.url === '/health') {
        this.handleHealthCheck(res);
      } else if (req.url === '/twitch/webhook' && req.method === 'POST') {
        this.handleTwitchWebhook(req, res);
      } else if (req.url === '/twitch/webhook' && req.method === 'GET') {
        this.handleWebhookVerification(req, res);
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    });

    this.server.listen(this.port, () => {
      this.logger.info(`Webhook server listening on port ${this.port}`);
    });
  }

  private handleHealthCheck(res: ServerResponse): void {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    }));
  }

  private handleWebhookVerification(req: IncomingMessage, res: ServerResponse): void {
    const url = new URL(req.url ?? '', `http://localhost:${this.port}`);
    const hubMode = url.searchParams.get('hub.mode');
    const hubTopic = url.searchParams.get('hub.topic');
    const _hubLease = url.searchParams.get('hub.lease_seconds');
    const hubChallenge = url.searchParams.get('hub.challenge');

    if (hubMode === 'subscribe' || hubMode === 'unsubscribe') {
      this.logger.info(`Webhook verification: ${hubMode} for ${hubTopic}`);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(hubChallenge ?? '');
      return;
    }

    res.statusCode = 404;
    res.end('Not Found');
  }

  private async handleTwitchWebhook(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const signature = req.headers['twitch-eventsub-message-signature'] as string;
    const messageId = req.headers['twitch-eventsub-message-id'] as string;
    const timestamp = req.headers['twitch-eventsub-message-timestamp'] as string;
    const messageType = req.headers['twitch-eventsub-message-type'] as string;

    if (messageType === 'webhook_callback_verification') {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
      }

      const challenge = body;
      this.logger.info('Webhook callback verification received');

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(challenge);
      return;
    }

    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    if (!this.verifySignature(body, signature, messageId, timestamp)) {
      this.logger.warn('Invalid webhook signature');
      res.statusCode = 401;
      res.end('Invalid signature');
      return;
    }

    try {
      const payload: TwitchWebhookPayload = JSON.parse(body);
      const eventType = payload.subscription.type;
      const event = payload.event;

      if (this.webhookHandler) {
        if (eventType === 'stream.online') {
          this.webhookHandler(event, 'online');
        } else if (eventType === 'stream.offline') {
          this.webhookHandler(event, 'offline');
        }
      }

      res.statusCode = 200;
      res.end('OK');
    } catch (error) {
      this.logger.error('Failed to process webhook:', error);
      res.statusCode = 500;
      res.end('Error');
    }
  }

  private verifySignature(
    body: string,
    signature: string,
    messageId: string,
    timestamp: string,
  ): boolean {
    const secret = config.twitch.webhookSecret;
    const message = messageId + timestamp + body;

    const hmac = crypto.createHmac('sha256', secret);
    const hash = 'sha256=' + hmac.update(message).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(hash));
  }

  public stop(): void {
    if (this.server) {
      this.server.close(() => {
        this.logger.info('Webhook server stopped');
      });
      this.server = null;
    }
  }
}
