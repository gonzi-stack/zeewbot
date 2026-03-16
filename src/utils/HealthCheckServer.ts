import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Logger } from 'winston';

export class HealthCheckServer {
  private server: ReturnType<typeof createServer> | null = null;
  private isHealthy: boolean = true;

  constructor(
    private logger: Logger,
    private port: number = 3000,
  ) {}

  public start(healthCheck?: () => boolean): void {
    this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (req.url === '/health') {
        const isHealthy = healthCheck ? healthCheck() : this.isHealthy;
        
        res.statusCode = isHealthy ? 200 : 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
        }));
      } else {
        res.statusCode = 404;
        res.end('Not Found');
      }
    });

    this.server.listen(this.port, () => {
      this.logger.info(`Health check server listening on port ${this.port}`);
    });
  }

  public stop(): void {
    if (this.server) {
      this.server.close(() => {
        this.logger.info('Health check server stopped');
      });
      this.server = null;
    }
  }

  public setHealthy(healthy: boolean): void {
    this.isHealthy = healthy;
  }
}
