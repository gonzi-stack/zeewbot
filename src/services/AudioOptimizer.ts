import { Track } from 'shoukaku';

/**
 * Géneros detectables automáticamente por el optimizador de audio.
 */
export type DetectedGenre =
  | 'electronic'
  | 'rock'
  | 'hiphop'
  | 'pop'
  | 'jazz'
  | 'lofi'
  | 'classical'
  | 'podcast'
  | 'live'
  | 'default';

/**
 * Perfil de audio calculado automáticamente para un track.
 */
export interface AudioProfile {
  /** Género detectado */
  genre: DetectedGenre;
  /** Etiqueta legible del género con emoji */
  genreLabel: string;
  /** Ecualizador de 15 bandas optimizado para el género */
  eq: { band: number; gain: number }[];
  /** Multiplicador de volumen por fuente (0.80 - 1.0) */
  sourceAdjust: number;
  /** Nombre de la fuente de audio */
  source: string;
}

// --- Etiquetas para cada género ---
const GENRE_LABELS: Record<DetectedGenre, string> = {
  electronic: '🎹 Electrónica',
  rock: '🎸 Rock',
  hiphop: '🎤 Hip-Hop',
  pop: '🎵 Pop',
  jazz: '🎷 Jazz',
  lofi: '🍃 Lo-fi',
  classical: '🎻 Clásica',
  podcast: '🎙️ Podcast',
  live: '📡 En vivo',
  default: '🎧 Audiófilo',
};

// --- Palabras clave para detección de género ---
// priority: mayor número = se prefiere si hay empate
const GENRE_KEYWORD_RULES: { genre: DetectedGenre; keywords: string[]; priority: number }[] = [
  {
    genre: 'lofi',
    keywords: ['lofi', 'lo-fi', 'lo fi', 'chillhop', 'chill beats', 'study beats', 'bedroom pop'],
    priority: 3,
  },
  {
    genre: 'electronic',
    keywords: [
      'edm', 'electronic', 'house', 'techno', 'trance', 'dubstep',
      'drum and bass', 'dnb', 'bass house', 'future bass', 'hardstyle',
      'remix', 'dj set', 'rave', 'synthwave', 'electro', 'deep house',
    ],
    priority: 2,
  },
  {
    genre: 'hiphop',
    keywords: [
      'hip hop', 'hip-hop', 'hiphop', 'rap', 'trap', 'drill',
      'grime', 'r&b', 'rnb', 'freestyle', 'boom bap',
    ],
    priority: 2,
  },
  {
    genre: 'rock',
    keywords: [
      'rock', 'metal', 'punk', 'grunge', 'alternative', 'indie rock',
      'hard rock', 'heavy metal', 'death metal', 'progressive rock',
      'post-rock', 'hardcore', 'nu metal',
    ],
    priority: 2,
  },
  {
    genre: 'classical',
    keywords: [
      'classical', 'orchestra', 'symphony', 'concerto', 'sonata',
      'opus', 'beethoven', 'mozart', 'bach', 'chopin', 'vivaldi',
      'debussy', 'tchaikovsky', 'philharmonic',
    ],
    priority: 2,
  },
  {
    genre: 'jazz',
    keywords: [
      'jazz', 'swing', 'bossa nova', 'blues', 'soul', 'funk',
      'acoustic', 'unplugged', 'smooth jazz',
    ],
    priority: 1,
  },
  {
    genre: 'podcast',
    keywords: [
      'podcast', 'episode', 'ep.', 'entrevista', 'interview',
      'charla', 'talk', 'audiobook', 'audiolibro', 'asmr',
    ],
    priority: 3,
  },
  {
    genre: 'pop',
    keywords: [
      'pop', 'k-pop', 'kpop', 'j-pop', 'jpop', 'reggaeton',
      'reggaetón', 'latin pop', 'dance pop', 'synth pop',
    ],
    priority: 1,
  },
];

// --- Ecualizadores por género (15 bandas, gains conservadores para evitar clipping) ---
const GENRE_EQ: Record<DetectedGenre, { band: number; gain: number }[]> = {
  // Electrónica: Sub-bass profundo, mids limpios, highs brillantes
  electronic: [
    { band: 0, gain: 0.15 },   // 25 Hz
    { band: 1, gain: 0.13 },   // 40 Hz
    { band: 2, gain: 0.10 },   // 63 Hz
    { band: 3, gain: 0.05 },   // 100 Hz
    { band: 4, gain: 0.00 },   // 160 Hz
    { band: 5, gain: -0.03 },  // 250 Hz
    { band: 6, gain: -0.02 },  // 400 Hz
    { band: 7, gain: 0.00 },   // 630 Hz
    { band: 8, gain: 0.02 },   // 1 kHz
    { band: 9, gain: 0.05 },   // 1.6 kHz
    { band: 10, gain: 0.06 },  // 2.5 kHz
    { band: 11, gain: 0.05 },  // 4 kHz
    { band: 12, gain: 0.04 },  // 6.3 kHz
    { band: 13, gain: 0.03 },  // 10 kHz
    { band: 14, gain: 0.02 },  // 16 kHz
  ],

  // Rock: Bajo con punch, mids con presencia, highs controlados
  rock: [
    { band: 0, gain: 0.08 },
    { band: 1, gain: 0.10 },
    { band: 2, gain: 0.08 },
    { band: 3, gain: 0.06 },
    { band: 4, gain: 0.04 },
    { band: 5, gain: 0.03 },
    { band: 6, gain: 0.05 },
    { band: 7, gain: 0.06 },
    { band: 8, gain: 0.05 },
    { band: 9, gain: 0.04 },
    { band: 10, gain: 0.03 },
    { band: 11, gain: 0.02 },
    { band: 12, gain: 0.01 },
    { band: 13, gain: 0.00 },
    { band: 14, gain: -0.01 },
  ],

  // Hip-Hop/Trap: Sub-bass pesado, mids scooped, presencia crispy
  hiphop: [
    { band: 0, gain: 0.18 },
    { band: 1, gain: 0.15 },
    { band: 2, gain: 0.12 },
    { band: 3, gain: 0.06 },
    { band: 4, gain: 0.00 },
    { band: 5, gain: -0.04 },
    { band: 6, gain: -0.03 },
    { band: 7, gain: -0.02 },
    { band: 8, gain: 0.02 },
    { band: 9, gain: 0.05 },
    { band: 10, gain: 0.04 },
    { band: 11, gain: 0.03 },
    { band: 12, gain: 0.02 },
    { band: 13, gain: 0.01 },
    { band: 14, gain: 0.00 },
  ],

  // Pop/Vocal: Vocales claras, bajo balanceado, brillo sutil
  pop: [
    { band: 0, gain: 0.05 },
    { band: 1, gain: 0.06 },
    { band: 2, gain: 0.05 },
    { band: 3, gain: 0.03 },
    { band: 4, gain: 0.02 },
    { band: 5, gain: 0.00 },
    { band: 6, gain: -0.01 },
    { band: 7, gain: 0.02 },
    { band: 8, gain: 0.04 },
    { band: 9, gain: 0.06 },
    { band: 10, gain: 0.05 },
    { band: 11, gain: 0.04 },
    { band: 12, gain: 0.03 },
    { band: 13, gain: 0.02 },
    { band: 14, gain: 0.00 },
  ],

  // Jazz/Acústico: Cálido, natural, bajos suaves
  jazz: [
    { band: 0, gain: 0.06 },
    { band: 1, gain: 0.05 },
    { band: 2, gain: 0.04 },
    { band: 3, gain: 0.03 },
    { band: 4, gain: 0.02 },
    { band: 5, gain: 0.01 },
    { band: 6, gain: 0.00 },
    { band: 7, gain: 0.00 },
    { band: 8, gain: 0.01 },
    { band: 9, gain: 0.02 },
    { band: 10, gain: 0.01 },
    { band: 11, gain: 0.00 },
    { band: 12, gain: -0.01 },
    { band: 13, gain: -0.01 },
    { band: 14, gain: -0.02 },
  ],

  // Lo-fi: Bajo cálido, highs atenuados (efecto vinilo)
  lofi: [
    { band: 0, gain: 0.10 },
    { band: 1, gain: 0.08 },
    { band: 2, gain: 0.06 },
    { band: 3, gain: 0.05 },
    { band: 4, gain: 0.03 },
    { band: 5, gain: 0.01 },
    { band: 6, gain: 0.00 },
    { band: 7, gain: -0.01 },
    { band: 8, gain: -0.01 },
    { band: 9, gain: -0.02 },
    { band: 10, gain: -0.03 },
    { band: 11, gain: -0.04 },
    { band: 12, gain: -0.05 },
    { band: 13, gain: -0.06 },
    { band: 14, gain: -0.08 },
  ],

  // Clásica: Muy plano, amplio rango dinámico
  classical: [
    { band: 0, gain: 0.02 },
    { band: 1, gain: 0.02 },
    { band: 2, gain: 0.01 },
    { band: 3, gain: 0.01 },
    { band: 4, gain: 0.00 },
    { band: 5, gain: 0.00 },
    { band: 6, gain: 0.00 },
    { band: 7, gain: 0.00 },
    { band: 8, gain: 0.01 },
    { band: 9, gain: 0.01 },
    { band: 10, gain: 0.01 },
    { band: 11, gain: 0.00 },
    { band: 12, gain: 0.00 },
    { band: 13, gain: -0.01 },
    { band: 14, gain: -0.01 },
  ],

  // Podcast/Voz: Claridad vocal, corte de graves, mids reforzados
  podcast: [
    { band: 0, gain: -0.06 },
    { band: 1, gain: -0.04 },
    { band: 2, gain: -0.02 },
    { band: 3, gain: 0.00 },
    { band: 4, gain: 0.02 },
    { band: 5, gain: 0.04 },
    { band: 6, gain: 0.05 },
    { band: 7, gain: 0.06 },
    { band: 8, gain: 0.07 },
    { band: 9, gain: 0.06 },
    { band: 10, gain: 0.04 },
    { band: 11, gain: 0.02 },
    { band: 12, gain: 0.00 },
    { band: 13, gain: -0.02 },
    { band: 14, gain: -0.04 },
  ],

  // Live: Neutral con leve warmth (contenido desconocido)
  live: [
    { band: 0, gain: 0.04 },
    { band: 1, gain: 0.03 },
    { band: 2, gain: 0.02 },
    { band: 3, gain: 0.01 },
    { band: 4, gain: 0.00 },
    { band: 5, gain: 0.00 },
    { band: 6, gain: 0.00 },
    { band: 7, gain: 0.00 },
    { band: 8, gain: 0.01 },
    { band: 9, gain: 0.01 },
    { band: 10, gain: 0.00 },
    { band: 11, gain: 0.00 },
    { band: 12, gain: 0.00 },
    { band: 13, gain: -0.01 },
    { band: 14, gain: -0.01 },
  ],

  // Default/Audiófilo: Bajo cálido, medios neutros, brillo sutil
  default: [
    { band: 0, gain: 0.12 },
    { band: 1, gain: 0.10 },
    { band: 2, gain: 0.08 },
    { band: 3, gain: 0.05 },
    { band: 4, gain: 0.03 },
    { band: 5, gain: 0.00 },
    { band: 6, gain: -0.02 },
    { band: 7, gain: 0.00 },
    { band: 8, gain: 0.02 },
    { band: 9, gain: 0.04 },
    { band: 10, gain: 0.03 },
    { band: 11, gain: 0.02 },
    { band: 12, gain: 0.01 },
    { band: 13, gain: 0.00 },
    { band: 14, gain: -0.02 },
  ],
};

// --- Ajuste de volumen por fuente de audio ---
// Cada fuente codifica a diferentes niveles de loudness
const SOURCE_VOLUME_ADJUST: Record<string, number> = {
  youtube: 0.93,       // YouTube tiende a ser más ruidoso
  soundcloud: 0.88,    // SoundCloud suele tener masters muy comprimidos
  spotify: 1.00,       // Spotify normaliza a -14 LUFS
  deezer: 0.98,        // Deezer es ligeramente más ruidoso
  tidal: 1.00,         // Tidal normaliza bien
  applemusic: 1.00,    // Apple Music normaliza bien
  bandcamp: 0.95,      // Bandcamp varía mucho, conservador
  vkmusic: 0.92,       // VK tiende a ser ruidoso
  audiomack: 0.93,     // Audiomack varía
  jiosaavn: 0.95,      // JioSaavn conservador
  yandexmusic: 0.95,   // Yandex conservador
  amazonmusic: 0.98,   // Amazon normaliza decente
  nicovideo: 0.90,     // NicoVideo muy variable
  twitch: 0.92,        // Twitch streams son ruidosos
  bilibili: 0.90,      // Bilibili variable
};

const DEFAULT_SOURCE_ADJUST = 0.95;

/**
 * AudioOptimizer — Motor de optimización automática de audio.
 *
 * Analiza los metadatos de cada track (título, autor, fuente, duración)
 * para detectar el género musical y aplicar el perfil de EQ y volumen
 * óptimo automáticamente.
 */
export class AudioOptimizer {
  /**
   * Analiza un track y devuelve el perfil de audio óptimo.
   */
  public static analyzeTrack(track: Track): AudioProfile {
    const source = track.info.sourceName || 'unknown';
    const genre = this.detectGenre(track);

    return {
      genre,
      genreLabel: GENRE_LABELS[genre],
      eq: GENRE_EQ[genre],
      sourceAdjust: this.getSourceVolumeAdjust(source),
      source,
    };
  }

  /**
   * Detecta el género musical a partir de los metadatos del track.
   * Usa heurística basada en palabras clave en título y autor.
   */
  public static detectGenre(track: Track): DetectedGenre {
    const searchText = `${track.info.title} ${track.info.author}`.toLowerCase();
    const isLiveStream = track.info.length <= 0;

    // Siempre buscar coincidencias de palabras clave primero,
    // incluso para live streams (ej: "lofi hip hop radio" debe ser lofi, no live)
    let bestMatch: DetectedGenre | null = null;
    let bestPriority = -1;
    let bestMatchCount = 0;

    for (const rule of GENRE_KEYWORD_RULES) {
      let matchCount = 0;

      for (const keyword of rule.keywords) {
        if (searchText.includes(keyword)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const score = matchCount * 10 + rule.priority;
        const currentBestScore = bestMatchCount * 10 + bestPriority;

        if (score > currentBestScore) {
          bestMatch = rule.genre;
          bestPriority = rule.priority;
          bestMatchCount = matchCount;
        }
      }
    }

    // Si se detectó un género por keywords, usarlo
    if (bestMatch) return bestMatch;

    // Si no se encontraron keywords y es un live stream, usar perfil live
    if (isLiveStream) return 'live';

    // Sin coincidencias, perfil por defecto
    return 'default';
  }

  /**
   * Obtiene el multiplicador de volumen para una fuente de audio.
   */
  public static getSourceVolumeAdjust(sourceName: string): number {
    return SOURCE_VOLUME_ADJUST[sourceName.toLowerCase()] ?? DEFAULT_SOURCE_ADJUST;
  }

  /**
   * Devuelve la etiqueta legible de un género.
   */
  public static getGenreLabel(genre: DetectedGenre): string {
    return GENRE_LABELS[genre];
  }
}
