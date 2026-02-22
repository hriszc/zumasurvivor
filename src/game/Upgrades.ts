import { PlayerStats } from './types';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  apply: (stats: PlayerStats) => void;
}

export const ALL_UPGRADES: Upgrade[] = [
  {
    id: 'dmg_up', name: 'Heavy Bullets', description: '+50% Damage', rarity: 'common',
    apply: (s) => s.damage *= 1.5
  },
  {
    id: 'atk_spd_up', name: 'Quick Draw', description: '+50% Attack Speed', rarity: 'common',
    apply: (s) => s.attackSpeed *= 1.5
  },
  {
    id: 'pierce_up', name: 'Armor Piercing', description: '+2 Pierce', rarity: 'rare',
    apply: (s) => s.pierce += 2
  },
  {
    id: 'multishot_up', name: 'Scatter Shot', description: '+2 Projectiles', rarity: 'epic',
    apply: (s) => s.multishot += 2
  },
  {
    id: 'bounce_up', name: 'Rubber Bullets', description: '+2 Bounces', rarity: 'rare',
    apply: (s) => s.bounce += 2
  },
  {
    id: 'explosive', name: 'Explosive Rounds', description: 'Projectiles explode on hit', rarity: 'epic',
    apply: (s) => { s.explosive = true; s.explosiveDamageMult += 0.2; }
  },
  {
    id: 'lightning', name: 'Chain Lightning', description: 'Projectiles emit lightning', rarity: 'epic',
    apply: (s) => { s.lightning = true; s.lightningChains += 2; }
  },
  {
    id: 'poison', name: 'Toxic Ammo', description: 'Applies poison over time', rarity: 'rare',
    apply: (s) => { s.poison = true; s.poisonDamage += 10; }
  },
  {
    id: 'crit_up', name: 'Sniper', description: '+20% Crit Chance, +100% Crit Damage', rarity: 'rare',
    apply: (s) => { s.critChance += 0.20; s.critDamage += 1.0; }
  },
  {
    id: 'big_explosions', name: 'Big Bang', description: '+50% Explosion Radius & Damage', rarity: 'rare',
    apply: (s) => { s.explosiveRadius *= 1.5; s.explosiveDamageMult += 0.5; }
  },
  {
    id: 'more_lightning', name: 'High Voltage', description: '+3 Lightning Chains', rarity: 'rare',
    apply: (s) => { s.lightningChains += 3; s.lightningDamageMult += 0.3; }
  },
  {
    id: 'lethal_poison', name: 'Lethal Toxin', description: 'Poison deals 2x damage', rarity: 'rare',
    apply: (s) => { s.poisonDamage *= 2; }
  }
];

export function getRandomUpgrades(count: number): Upgrade[] {
  let shuffled = [...ALL_UPGRADES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
