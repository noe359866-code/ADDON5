export type Lang = 'es' | 'eu';
export type LearnLang = Lang | 'both';
export type UiLang = Lang;
export type Route = 'visual' | 'auditivo' | 'mixta';
export type Modality = 'visual' | 'auditivo' | 'any';
export type ExerciseKind = 'choice' | 'build' | 'tap' | 'story';

export interface Option {
  id: string;
  label: string;
  emoji?: string;
  sub?: string;
}

export interface Tile {
  id: string;
  label: string;
}

export interface Exercise {
  id: string;
  kind: ExerciseKind;
  modality: Modality;
  levelId: number;
  lang: Lang;
  eyebrow: string;
  prompt: string;
  display?: {
    variant: 'emoji' | 'word' | 'blank' | 'chunks' | 'hidden' | 'number' | 'none';
    emoji?: string;
    text?: string;
    chunks?: string[];
    highlight?: string;
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
  bigText: boolean;
  unlockAll: boolean;
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
