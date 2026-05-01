import { Shoukaku, Connectors, Player, Track, Node } from 'shoukaku';
import { EmbedBuilder, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } from 'discord.js';
import { IBot } from '../interfaces/IBot';
import config from '../../config.json';
import { AudioOptimizer, AudioProfile } from './AudioOptimizer';

// Volumen por defecto del player (0-100, se convierte a 0.0-1.0)
const DEFAULT_VOLUME = 85;

// Estado de la cola de música por guild
interface MusicQueue {
  player: Player;
  tracks: Track[];
  current: Track | null;
  textChannelId: string;
  volume: number;
  eqEnabled: boolean;
  currentProfile?: AudioProfile;
  lastMessage?: Message;
}

export function getMusicActionRow(isPaused: boolean = false) {
  const playPauseButton = new ButtonBuilder()
    .setCustomId('music_pause')
    .setLabel(isPaused ? 'Reanudar' : 'Pausar')
    .setEmoji(isPaused ? '▶️' : '⏸️')
    .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Secondary);
    
  const skipButton = new ButtonBuilder()
    .setCustomId('music_skip')
    .setLabel('Saltar')
    .setEmoji('⏭️')
    .setStyle(ButtonStyle.Primary);
    
  const stopButton = new ButtonBuilder()
    .setCustomId('music_stop')
    .setLabel('Detener')
    .setEmoji('⏹️')
    .setStyle(ButtonStyle.Danger);
    
  const queueButton = new ButtonBuilder()
    .setCustomId('music_queue')
    .setLabel('Cola')
    .setEmoji('📋')
    .setStyle(ButtonStyle.Secondary);

  return new ActionRowBuilder<ButtonBuilder>().addComponents(playPauseButton, skipButton, stopButton, queueButton);
}

export class MusicService {
  public shoukaku: Shoukaku;
  private queues: Map<string, MusicQueue> = new Map();
  private client: IBot;

  constructor(client: IBot) {
    this.client = client;

    // Configurar nodos de NodeLink/Lavalink
    const nodes = [{
      name: config.nodelink.name,
      url: config.nodelink.url,
      auth: config.nodelink.auth,
    }];

    // Inicializar Shoukaku ANTES de client.login() (requisito de la librería)
    this.shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes);

    // Manejar eventos de Shoukaku
    this.shoukaku.on('error', (_, error) => {
      this.client.logger.error('Shoukaku error:', error);
    });

    this.shoukaku.on('ready', (name) => {
      this.client.logger.info(`🎵 Nodo de audio conectado: ${name}`);
    });

    this.shoukaku.on('close', (name, code, reason) => {
      this.client.logger.warn(`🎵 Nodo ${name} desconectado (${code}): ${reason}`);
    });

    this.shoukaku.on('disconnect', (name, count) => {
      this.client.logger.warn(`🎵 Nodo ${name} desconectado, intentos: ${count}`);
    });
  }

  /**
   * Obtiene un nodo disponible para resolver tracks
   */
  private getNode(): Node | undefined {
    return this.shoukaku.options.nodeResolver(this.shoukaku.nodes);
  }

  /**
   * Obtiene la cola de un guild
   */
  public getQueue(guildId: string): MusicQueue | undefined {
    return this.queues.get(guildId);
  }

  /**
   * Busca y resuelve una query (URL directa o búsqueda de texto)
   */
  public async resolve(query: string): Promise<Track[] | null> {
    const node = this.getNode();
    if (!node) return null;

    // Si es una URL, resolver directamente; si no, buscar con ytsearch:
    const isUrl = /^https?:\/\//.test(query);
    const identifier = isUrl ? query : `ytsearch:${query}`;

    const result = await node.rest.resolve(identifier);
    if (!result) return null;

    switch (result.loadType) {
      case 'track':
        return [result.data];
      case 'playlist':
        return result.data.tracks;
      case 'search': {
        // Filtrar live streams de búsquedas (causan problemas de playback)
        const nonLive = result.data.filter(t => t.info.length > 0);
        return nonLive.length > 0 ? [nonLive[0]] : null;
      }
      case 'empty':
      case 'error':
        return null;
      default:
        return null;
    }
  }

  /**
   * Conecta al canal de voz y crea/reutiliza un player
   */
  public async play(
    guildId: string,
    channelId: string,
    textChannelId: string,
    track: Track,
  ): Promise<void> {
    let queue = this.queues.get(guildId);

    if (!queue) {
      // Crear nuevo player uniéndose al canal de voz
      // selfDeaf: true mejora calidad ya que Discord asigna mayor prioridad de bitrate
      const player = await this.shoukaku.joinVoiceChannel({
        guildId,
        channelId,
        shardId: 0,
        deaf: true,
      });

      queue = {
        player,
        tracks: [],
        current: null,
        textChannelId,
        volume: DEFAULT_VOLUME,
        eqEnabled: true,
      };

      this.queues.set(guildId, queue);
      this.setupPlayerEvents(guildId, player);

      // Aplicar volumen inicial al player
      player.setFilterVolume(queue.volume / 100);
    }

    // Agregar track a la cola
    queue.tracks.push(track);

    // Si no hay nada reproduciéndose, empezar
    if (!queue.current) {
      await this.playNext(guildId);
    }
  }

  /**
   * Reproduce el siguiente track de la cola
   */
  private async playNext(guildId: string): Promise<void> {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    const nextTrack = queue.tracks.shift();
    if (!nextTrack) {
      // Eliminar botones del último mensaje antes de limpiar la cola
      if (queue.lastMessage) {
        try {
          await queue.lastMessage.edit({ components: [] });
        } catch (err) {
          this.client.logger.warn(`No se pudo remover botones del mensaje:`, err);
        }
      }

      // Cola vacía, limpiar
      queue.current = null;
      this.shoukaku.leaveVoiceChannel(guildId);
      this.queues.delete(guildId);

      // Notificar que la cola terminó
      try {
        const channel = this.client.channels.cache.get(queue.textChannelId) as TextChannel;
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(config.colors.info as `#${string}`)
            .setDescription('📭 La cola de reproducción ha terminado. Desconectando...');
          await channel.send({ embeds: [embed] });
        }
      } catch {
        // Silenciar errores de envío de mensajes
      }
      return;
    }

    queue.current = nextTrack;

    // Eliminar los botones del mensaje anterior si existe
    if (queue.lastMessage) {
      try {
        await queue.lastMessage.edit({ components: [] });
      } catch {
        // Ignorar si el mensaje fue borrado
      }
    }

    // Reproducir el track
    queue.player.playTrack({ track: { encoded: nextTrack.encoded } });

    // Auto-optimizar audio: analizar track y aplicar perfil óptimo
    const profile = await this.autoOptimizeTrack(guildId, nextTrack);

    // Enviar el nuevo reproductor al canal
    try {
      const channel = this.client.channels.cache.get(queue.textChannelId) as TextChannel;
      if (channel) {
        const duration = MusicService.formatDuration(nextTrack.info.length);
        const author = nextTrack.info.author || 'Desconocido';

        const embed = new EmbedBuilder()
          .setColor(config.colors.primary as `#${string}`)
          .setAuthor({ name: '♪ Reproduciendo' })
          .setDescription(
            `**[${nextTrack.info.title}](${nextTrack.info.uri ?? ''})**\n` +
            `${author} · \`${duration}\``,
          );

        if (nextTrack.info.artworkUrl) {
          embed.setThumbnail(nextTrack.info.artworkUrl);
        }

        // Footer con perfil auto-detectado
        const footerParts: string[] = [];
        if (profile) {
          footerParts.push(profile.genreLabel);
        }
        if (queue.tracks.length > 0) {
          footerParts.push(`${queue.tracks.length} en cola`);
        }
        if (footerParts.length > 0) {
          embed.setFooter({ text: footerParts.join('  ·  ') });
        }

        const msg = await channel.send({
          embeds: [embed],
          components: [getMusicActionRow(false)]
        });
        queue.lastMessage = msg;
      }
    } catch {
      // Silenciar errores
    }
  }

  /**
   * Configura los eventos del player (trackEnd, error, stuck)
   */
  private setupPlayerEvents(guildId: string, player: Player): void {
    player.on('end', (data) => {
      // Solo avanzar si terminó naturalmente (no por skip/stop)
      if (data.reason === 'replaced') return;
      if (data.reason === 'stopped') return;

      this.playNext(guildId);
    });

    player.on('exception', (data) => {
      this.client.logger.error(`Error en track (guild ${guildId}):`, data);
      this.notifyError(guildId, `Error al reproducir: ${data.exception?.message ?? 'desconocido'}`);
      this.playNext(guildId);
    });

    player.on('stuck', (data) => {
      this.client.logger.warn(`Track atascado (guild ${guildId}):`, data);
      this.notifyError(guildId, 'El track se atascó, saltando al siguiente...');
      this.playNext(guildId);
    });

    player.on('closed', (data) => {
      this.client.logger.warn(`WebSocket cerrado (guild ${guildId}): code ${data.code}`);
      this.destroy(guildId);
    });
  }

  /**
   * Auto-optimiza el audio para un track específico:
   * 1. Analiza metadatos (título, autor, fuente, duración)
   * 2. Detecta el género musical
   * 3. Aplica EQ optimizado para el género
   * 4. Ajusta volumen según la fuente de audio
   */
  private async autoOptimizeTrack(guildId: string, track: Track): Promise<AudioProfile | null> {
    const queue = this.queues.get(guildId);
    if (!queue) return null;

    try {
      // Analizar el track y obtener perfil óptimo
      const profile = AudioOptimizer.analyzeTrack(track);
      queue.currentProfile = profile;

      // Esperar un momento para que el player inicialice el stream
      // antes de aplicar filtros (evita timeout en live streams)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Aplicar volumen ajustado por fuente (corrección de loudness)
      const adjustedVolume = (queue.volume / 100) * profile.sourceAdjust;
      queue.player.setFilterVolume(adjustedVolume);

      // Aplicar EQ del género detectado si está habilitado
      if (queue.eqEnabled) {
        await queue.player.setEqualizer(profile.eq);
      }

      this.client.logger.info(
        `🎛️ Auto-audio: ${profile.genreLabel} | ` +
        `Fuente: ${profile.source} (vol ×${Math.round(profile.sourceAdjust * 100)}%) | ` +
        `EQ: ${queue.eqEnabled ? 'ON' : 'OFF'} | ` +
        `Track: ${track.info.title}`,
      );

      return profile;
    } catch (error: unknown) {
      this.client.logger.warn('Error en auto-optimización de audio:', error);
      return null;
    }
  }

  /**
   * Notifica un error al canal de texto asociado
   */
  private async notifyError(guildId: string, message: string): Promise<void> {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    try {
      const channel = this.client.channels.cache.get(queue.textChannelId) as TextChannel;
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.error as `#${string}`)
          .setDescription(`⚠️ ${message}`);
        await channel.send({ embeds: [embed] });
      }
    } catch {
      // Silenciar
    }
  }

  /**
   * Salta al siguiente track
   */
  public async skip(guildId: string): Promise<Track | null> {
    const queue = this.queues.get(guildId);
    if (!queue || !queue.current) return null;

    const skipped = queue.current;

    // stopTrack dispara el evento 'end' con reason 'stopped',
    // pero necesitamos avanzar manualmente
    queue.player.stopTrack();
    await this.playNext(guildId);

    return skipped;
  }

  /**
   * Detiene la reproducción, limpia la cola y desconecta
   */
  public async stop(guildId: string): Promise<void> {
    const queue = this.queues.get(guildId);
    if (!queue) return;

    if (queue.lastMessage) {
      try {
        await queue.lastMessage.edit({ components: [] });
      } catch (err) {
        this.client.logger.warn('No se pudo remover botones en stop:', err);
      }
    }

    queue.tracks = [];
    queue.current = null;
    queue.player.stopTrack();
    this.shoukaku.leaveVoiceChannel(guildId);
    this.queues.delete(guildId);
  }

  /**
   * Alterna la pausa
   */
  public togglePause(guildId: string): boolean {
    const queue = this.queues.get(guildId);
    if (!queue || !queue.current) return false;

    
    const isPaused = queue.player.paused;
    queue.player.setPaused(!isPaused);
    return !isPaused;
  }

  /**
   * Ajusta el volumen del player (0-150)
   * Aplica automáticamente la corrección de fuente si hay un perfil activo
   */
  public setVolume(guildId: string, volume: number): number | null {
    const queue = this.queues.get(guildId);
    if (!queue || !queue.current) return null;

    // Clampar entre 0 y 150 (permitir un poco de boost si el usuario lo desea)
    const clamped = Math.max(0, Math.min(150, volume));
    queue.volume = clamped;

    // Aplicar volumen con corrección de fuente si hay perfil auto-detectado
    const sourceAdjust = queue.currentProfile?.sourceAdjust ?? 1.0;
    queue.player.setFilterVolume((clamped / 100) * sourceAdjust);
    return clamped;
  }

  /**
   * Alterna el ecualizador automático.
   * Cuando se reactiva, aplica el EQ del género auto-detectado del track actual.
   */
  public async toggleEqualizer(guildId: string): Promise<boolean | null> {
    const queue = this.queues.get(guildId);
    if (!queue || !queue.current) return null;

    queue.eqEnabled = !queue.eqEnabled;

    if (queue.eqEnabled && queue.currentProfile) {
      // Re-aplicar el EQ auto-detectado del track actual
      await queue.player.setEqualizer(queue.currentProfile.eq);
    } else if (queue.eqEnabled) {
      // Sin perfil previo, analizar el track actual
      const profile = AudioOptimizer.analyzeTrack(queue.current!);
      queue.currentProfile = profile;
      await queue.player.setEqualizer(profile.eq);
    } else {
      // EQ desactivado: ecualizador plano
      await queue.player.setEqualizer([]);
    }

    return queue.eqEnabled;
  }

  /**
   * Obtiene el perfil de audio actual de un guild
   */
  public getCurrentProfile(guildId: string): AudioProfile | undefined {
    return this.queues.get(guildId)?.currentProfile;
  }

  /**
   * Destruye la sesión de un guild (para desconexiones forzadas)
   */
  public destroy(guildId: string): void {
    const queue = this.queues.get(guildId);
    if (queue) {
      if (queue.lastMessage) {
        queue.lastMessage.edit({ components: [] }).catch(() => {});
      }
      queue.tracks = [];
      queue.current = null;
    }
    try {
      this.shoukaku.leaveVoiceChannel(guildId);
    } catch {
      // Puede fallar si ya está desconectado
    }
    this.queues.delete(guildId);
  }

  /**
   * Formatea duración en milisegundos a mm:ss
   */
  public static formatDuration(ms: number): string {
    if (ms <= 0) return '🔴 LIVE';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Limpia todas las sesiones al apagar el bot
   */
  public cleanup(): void {
    for (const [guildId] of this.queues) {
      this.destroy(guildId);
    }
  }
}
