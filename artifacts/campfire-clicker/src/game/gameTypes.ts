export type RoastPhase = 'idle' | 'roasting' | 'early' | 'normal' | 'golden' | 'burnt';

export interface CampfireState {
  marshmallows: number;
  mpr: number;
  sticks: number;
  friends: number;
  friendMpr: number;
  mps: number;
  nights: number;
  activeSeconds: number;
  goldenFriends: boolean;
}

export interface RoastState {
  progress: number;
  phase: RoastPhase;
  lastAward: number;
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  amount: number;
  purchased: number;
  unlocked: boolean;
  affordable: boolean;
  category: 'player' | 'friends';
}

export interface CampfireGame {
  state: CampfireState;
  roast: RoastState;
  upgrades: Upgrade[];
  offlineEarnings: number;
  lastSavedAt: number;
  musicEnabled: boolean;
  startRoast(): void;
  releaseRoast(): void;
  buyUpgrade(id: string): void;
  setMusicEnabled(enabled: boolean): void;
  exportSave(): void;
  importSave(file: File): Promise<void>;
}
