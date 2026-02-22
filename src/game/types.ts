export interface Vector2 {
  x: number;
  y: number;
}

export interface Segment {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  isSpecial: boolean;
  poisonStacks: number;
  poisonTimer: number;
  dead: boolean;
}

export interface Snake {
  id: number;
  segments: Segment[];
  tangentialDir: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pierce: number;
  bounce: number;
  hitSegments: Set<number>;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

export interface PlayerStats {
  damage: number;
  attackSpeed: number;
  projectileSpeed: number;
  pierce: number;
  bounce: number;
  multishot: number;
  explosive: boolean;
  explosiveRadius: number;
  explosiveDamageMult: number;
  lightning: boolean;
  lightningChains: number;
  lightningDamageMult: number;
  poison: boolean;
  poisonDamage: number;
  critChance: number;
  critDamage: number;
}
