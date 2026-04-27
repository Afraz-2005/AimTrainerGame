export enum GameView {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  RESULTS = 'RESULTS',
}

export enum GameMode {
  GRIDSHOT = 'GRIDSHOT',
  SIXSHOT = 'SIXSHOT',
  TRACKING = 'TRACKING',
  POP_BOTS = 'POP_BOTS',
  MAP = 'MAP',
  REACTION = 'REACTION',
}

export type WeaponType = 'PISTOL' | 'AK47' | 'AWP' | 'KNIFE';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface PopBotsSettings {
  weapon: WeaponType;
  difficulty: Difficulty;
  botColor: string;
  obstacleColor: string;
}

export interface MapSettings {
  botsHitBack: boolean;
  botsToKill: number;
  infiniteAmmo: boolean;
  isStaticBots: boolean;
  difficulty: Difficulty;
}

export interface CrosshairSettings {
  style: 'cross' | 'dot' | 'circle' | 't-shape';
  size: number;
  thickness: number;
  gap: number;
  color: string;
  opacity: number;
}

export interface HUDSettings {
  color: string;
  scale: number;
  showFPS: boolean;
  showKills: boolean;
}

export interface GameSettings {
  sensitivity: number;
  adsSensitivity: number;
  fov: number;
  crosshair: CrosshairSettings;
  hud: HUDSettings;
  mode: GameMode;
  theme: 'light' | 'dark' | 'retro';
  themeColor: string;
  popBots: PopBotsSettings;
  map: MapSettings;
}

export interface GameStats {
  score: number;
  hits: number;
  misses: number;
  accuracy: number;
  timeRemaining: number;
  health?: number;
  ammo?: number;
  maxAmmo?: number;
  lastReactionTime?: number;
  isReloading?: boolean;
  status?: 'victory' | 'loss';
  playerPos?: { x: number; z: number };
  playerYaw?: number;
  activeTargets?: TargetData[];
}

export interface TargetData {
  id: string;
  position: [number, number, number];
  size: number;
  spawnIndex?: number;
  health: number;
  isSniper?: boolean;
}
