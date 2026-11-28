export type Lang = 'es' | 'eu' | 'en';
export type LearnLang = Lang | 'both'; // 'both' = solo Euskera + Español
export type DifficultyLevel = 'bajo' | 'medio' | 'alto';
export type SchoolStage = 'general' | 'infantil' | 'prim12' | 'prim34' | 'prim56';
export type UiLang = 'es' | 'eu';
export type Route = 'visual' | 'auditivo' | 'mixta';
export type Modality = 'visual' | 'auditivo' | 'any';
export type ExerciseKind = 'choice' | 'build' | 'tap' | 'story' | 'action' | 'pairs' | 'dictation';
export type SyllableStage = 1 | 2 | 3; // 1: Directas (CV), 2: Inversas (VC), 3: Trabadas (CCV)

/**
 * Las 4 fases del aprendizaje de la lectura (de la pre-lectura a la lectura madura).
 * Un lector experto no abandona la fase alfabética: usa ambas rutas en paralelo (modelo de doble ruta).
 */
export type ReadingPhase = 'fonologica' | 'logográfica' | 'alfabética' | 'ortográfica';

export type NavTab =
  | 'learn'
  | 'reading'
  | 'dictionary'
  | 'letters'
  | 'stories'
  | 'practice'
  | 'leaderboard'
  | 'quests'
  | 'shop'
  | 'profile';

export type OutfitId = 'classic' | 'explorer' | 'super' | 'royal' | 'cool';

export type SessionMode =
  | 'level'
  | 'practice'
  | 'legendary'
  | 'timed'
  | 'mistakes'
  | 'listening'
  | 'letters';

export interface Option {
  id: string;
  label: string;
  emoji?: string;
  sub?: string;
  color?: string;
  pattern?: string;
  symbol?: string;
  audioText?: string;
}

export interface Tile {
  id: string;
  label: string;
}

export interface PairCard {
  id: string;
  pairId: string;
  side: 'left' | 'right';
  label: string;
  emoji?: string;
  lang?: Lang;
}

export interface ActionItem {
  id: string;
  emoji: string;
  label: string;
}

/** Minijuegos sin fallo dentro de una tarjeta de acción de Pato Ventura. */
export type ActionGame =
  | { kind: 'imitate' }
  | { kind: 'count'; target: number; emoji: string; label: string }
  | { kind: 'breathe'; target: number; label: string }
  | { kind: 'bubbles'; target: number; label: string }
  | { kind: 'find'; items: ActionItem[]; label: string };

export interface Exercise {
  id: string;
  kind: ExerciseKind;
  modality: Modality;
  levelId: number;
  lang: Lang;
  eyebrow: string;
  prompt: string;
  display?: {
    variant: 'emoji' | 'word' | 'blank' | 'chunks' | 'hidden' | 'number' | 'objects' | 'swatch' | 'none';
    emoji?: string;
    text?: string;
    chunks?: string[];
    highlight?: string;
    color?: string;
    pattern?: string;
    symbol?: string;
  };
  audio?: { text: string; lang: Lang; syllables?: string[] };
  options?: Option[];
  correctId?: string;
  tiles?: Tile[];
  correctOrder?: string[];
  unit?: 'letter' | 'syllable' | 'word';
  dictationTarget?: string;
  dictationPlaceholder?: string;
  chips?: Tile[];
  correctChip?: string;
  pairs?: PairCard[];
  story?: { title: string; text: string; shortText?: string; emoji: string };
  action?: { emoji: string; text: string; steps?: string[]; game?: ActionGame };
  hint: string;
  explanation: string;
  autoAudio: boolean;
  isReview?: boolean;
  syllableStage?: SyllableStage;
}

export interface MistakeEntry {
  id: string;
  prompt: string;
  answer: string;
  lang: Lang;
  levelId: number;
  addedAt: string;
}

export interface DoubleWager {
  active: boolean;
  startDate: string;
}

export interface Progress {
  onboarded: boolean;
  name: string;
  joinedDate: string;
  uiLang: UiLang;
  learnLang: LearnLang;
  difficultyLevel: DifficultyLevel;
  schoolStage: SchoolStage;
  readingPhase: ReadingPhase;
  speechRate: number;
  route: Route;
  sound: boolean;
  music: boolean;
  darkMode: boolean;
  bigText: boolean;
  unlockAll: boolean;
  calmMode: boolean;

  /* Gamificación estilo Duolingo */
  xp: number;
  gems: number;
  hearts: number;
  unlimitedHearts: boolean;
  dailyGoal: number;
  dailyXp: number;
  dailyLessons: number;
  dailyHighAcc: number;
  dailyDate: string;
  xpHistory: Record<string, number>;
  streak: number;
  bestStreak: number;
  streakFreezes: number;
  frozenDates: string[];
  doubleOrNothing: DoubleWager | null;
  xpBoostUntil: number;
  leagueId: number;

  /* Progreso del camino, cuentos, letras y tienda */
  stars: Record<number, number>;
  completed: Record<number, boolean>;
  legendary: Record<number, boolean>;
  nodeProgress: Record<string, number>;
  chestsClaimed: string[];
  questClaims: Record<string, boolean>;
  storiesRead: string[];
  lettersMastered: string[];
  mistakes: MistakeEntry[];
  outfits: OutfitId[];
  equippedOutfit: OutfitId;

  badges: string[];
  lastPlayed: string;
  sessions: number;
  perfectSessions: number;
  correctTotal: number;
}

export interface SessionResult {
  mode: SessionMode;
  levelId: number | null;
  nodeKey?: string;
  total: number;
  correct: number;
  xp: number;
  gemsEarned: number;
  durationSec: number;
  xpBoosted?: boolean;
  stars: number;
  maxStreak: number;
  visualStreak: number;
  audioStreak: number;
  langsUsed: Lang[];
  perfect: boolean;
  heartsRestored?: number;
}
