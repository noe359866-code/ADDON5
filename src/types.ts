export type Lang = 'es' | 'eu';
export type LearnLang = Lang | 'both';
export type UiLang = Lang;
export type Route = 'visual' | 'auditivo' | 'mixta';
export type Modality = 'visual' | 'auditivo' | 'any';
export type ExerciseKind = 'choice' | 'build' | 'tap' | 'story' | 'action';

export type SupportId =
  | 'cognitiva'
  | 'comprension'
  | 'comunicacion'
  | 'dislexia'
  | 'tdah'
  | 'tea'
  | 'down';

export interface Option {
  id: string;
  label: string;
  emoji?: string;
  sub?: string;
  color?: string;
}

export interface Tile {
  id: string;
  label: string;
}

export interface ActionItem {
  id: string;
  emoji: string;
  label: string;
}

/** Minijuegos sin fallo dentro de una tarjeta de acción de Luma. */
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
  };
  audio?: { text: string; lang: Lang };
  options?: Option[];
  correctId?: string;
  tiles?: Tile[];
  correctOrder?: string[];
  unit?: 'syllable' | 'word';
  chips?: Tile[];
  correctChip?: string;
  story?: { title: string; text: string; emoji: string };
  action?: { emoji: string; text: string; steps?: string[]; game?: ActionGame };
  hint: string;
  explanation: string;
  autoAudio: boolean;
}

export interface Progress {
  onboarded: boolean;
  name: string;
  uiLang: UiLang;
  learnLang: LearnLang;
  route: Route;
  sound: boolean;
  music: boolean;
  bigText: boolean;
  unlockAll: boolean;
  supports: SupportId[];
  calmMode: boolean;
  xp: number;
  stars: Record<number, number>;
  completed: Record<number, boolean>;
  badges: string[];
  streak: number;
  lastPlayed: string;
  sessions: number;
  correctTotal: number;
}

export interface SessionResult {
  mode: 'level' | 'practice';
  levelId: number | null;
  total: number;
  correct: number;
  xp: number;
  stars: number;
  maxStreak: number;
  visualStreak: number;
  audioStreak: number;
  langsUsed: Lang[];
  perfect: boolean;
}
