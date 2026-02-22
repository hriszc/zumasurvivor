import { PlayerStats, Snake, Segment, Projectile, Particle, FloatingText } from './types';
import { getRandomUpgrades, Upgrade } from './Upgrades';

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  
  lastTime: number = 0;
  reqId: number = 0;
  isRunning: boolean = false;
  
  player = { x: 0, y: 0 };
  stats: PlayerStats;
  
  snakes: Snake[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  texts: FloatingText[] = [];
  
  shootTimer: number = 0;
  nextId: number = 1;
  pendingLevelUps: number = 0;
  
  onLevelUp: (choices: Upgrade[]) => void;
  onGameOver: () => void;
  onVictory: () => void;
  onScoreUpdate: (score: number) => void;
  
  camera = { x: 0, y: 0, zoom: 1 };
  score: number = 0;
  
  constructor(canvas: HTMLCanvasElement, callbacks: any) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onLevelUp = callbacks.onLevelUp;
    this.onGameOver = callbacks.onGameOver;
    this.onVictory = callbacks.onVictory;
    this.onScoreUpdate = callbacks.onScoreUpdate;
    
    this.stats = {
      damage: 15,
      attackSpeed: 4,
      projectileSpeed: 800,
      pierce: 0,
      bounce: 0,
      multishot: 1,
      explosive: false,
      explosiveRadius: 90,
      explosiveDamageMult: 0.4,
      lightning: false,
      lightningChains: 4,
      lightningDamageMult: 0.4,
      poison: false,
      poisonDamage: 8,
      critChance: 0.10,
      critDamage: 2,
    };
    
    this.init();
  }
  
  init() {
    this.player = { x: 0, y: 0 };
    this.snakes = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.score = 0;
    this.pendingLevelUps = 0;
    this.onScoreUpdate(this.score);
    
    let segments: Segment[] = [];
    let angle = 0;
    let radius = 800;
    let hpMultiplier = 1;
    
    for (let i = 0; i < 1000; i++) {
      let isSpecial = (i % 30 === 29);
      let hp = 15 * hpMultiplier * (isSpecial ? 4 : 1);
      segments.push({
        id: this.nextId++,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        hp: hp,
        maxHp: hp,
        isSpecial: isSpecial,
        poisonStacks: 0,
        poisonTimer: 0,
        dead: false
      });
      angle -= 0.08;
      radius += 0.5;
      hpMultiplier += 0.004;
    }
    
    // Settle distances
    for(let k=0; k<50; k++) {
      for (let i = 1; i < segments.length; i++) {
        let prev = segments[i-1];
        let curr = segments[i];
        let dx = prev.x - curr.x;
        let dy = prev.y - curr.y;
        let d = Math.hypot(dx, dy);
        if (d !== 15 && d > 0) {
          curr.x += (dx / d) * (d - 15);
          curr.y += (dy / d) * (d - 15);
        }
      }
    }
    
    this.snakes.push({
      id: this.nextId++,
      segments: segments,
      tangentialDir: 1
    });
  }
  
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.reqId = requestAnimationFrame((t) => this.loop(t));
  }
  
  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.reqId);
  }
  
  resume() {
    if (this.pendingLevelUps > 0) {
      this.pendingLevelUps--;
      this.onLevelUp(getRandomUpgrades(3));
      return;
    }
    this.isRunning = true;
    this.lastTime = performance.now();
    this.reqId = requestAnimationFrame((t) => this.loop(t));
  }
  
  applyUpgrade(upgrade: Upgrade) {
    upgrade.apply(this.stats);
  }
  
  loop(time: number) {
    if (!this.isRunning) return;
    let dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    
    if (dt > 0.1) dt = 0.1;
    
    this.update(dt);
    this.draw();
    
    if (this.isRunning) {
      this.reqId = requestAnimationFrame((t) => this.loop(t));
    }
  }
  
  update(dt: number) {
    this.camera.x = this.player.x;
    this.camera.y = this.player.y;
    
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootTimer = 1 / this.stats.attackSpeed;
      this.shoot();
    }
    
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      let p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      
      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }
      
      let hit = false;
      for (let s of this.snakes) {
        for (let seg of s.segments) {
          if (seg.dead || p.hitSegments.has(seg.id)) continue;
          
          let d = Math.hypot(p.x - seg.x, p.y - seg.y);
          let radius = seg.isSpecial ? 18 : 10;
          if (d < radius + 5) {
            this.handleHit(p, s, seg);
            hit = true;
            break;
          }
        }
        if (hit && p.life <= 0) break;
      }
    }
    
    let playerHit = false;
    for (let s of this.snakes) {
      if (s.segments.length === 0) continue;
      
      let head = s.segments[0];
      let dirX = this.player.x - head.x;
      let dirY = this.player.y - head.y;
      let dist = Math.hypot(dirX, dirY);
      
      if (dist < 20) {
        playerHit = true;
      }
      
      if (dist > 0) {
        dirX /= dist;
        dirY /= dist;
      }
      
      let perpX = -dirY * s.tangentialDir;
      let perpY = dirX * s.tangentialDir;
      
      let radialSpeed = 8 + Math.min(this.score * 0.015, 25);
      let tangentialSpeed = 30;
      
      head.x += (dirX * radialSpeed + perpX * tangentialSpeed) * dt;
      head.y += (dirY * radialSpeed + perpY * tangentialSpeed) * dt;
      
      for (let i = 1; i < s.segments.length; i++) {
        let prev = s.segments[i-1];
        let curr = s.segments[i];
        let dx = prev.x - curr.x;
        let dy = prev.y - curr.y;
        let d = Math.hypot(dx, dy);
        let targetD = 15;
        if (d > targetD) {
          curr.x += (dx / d) * (d - targetD);
          curr.y += (dy / d) * (d - targetD);
        }
      }
      
      for (let seg of s.segments) {
        if (seg.poisonStacks > 0) {
          seg.poisonTimer -= dt;
          if (seg.poisonTimer <= 0) {
            seg.poisonTimer = 0.5;
            let dmg = this.stats.poisonDamage * seg.poisonStacks;
            this.damageSegment(seg, dmg, false, '#55ff55');
          }
        }
      }
    }
    
    if (playerHit) {
      this.isRunning = false;
      this.onGameOver();
      return;
    }
    
    let newSnakes: Snake[] = [];
    let levelUpTriggered = 0;
    let totalSegments = 0;
    
    for (let s of this.snakes) {
      let currentSegments: Segment[] = [];
      for (let seg of s.segments) {
        if (seg.dead) {
          if (currentSegments.length > 0) {
            newSnakes.push({ id: this.nextId++, segments: currentSegments, tangentialDir: s.tangentialDir });
            currentSegments = [];
          }
          if (seg.isSpecial) {
            levelUpTriggered++;
          }
        } else {
          currentSegments.push(seg);
          totalSegments++;
        }
      }
      if (currentSegments.length > 0) {
        newSnakes.push({ id: this.nextId++, segments: currentSegments, tangentialDir: s.tangentialDir });
      }
    }
    this.snakes = newSnakes;
    
    if (totalSegments === 0) {
      this.isRunning = false;
      this.onVictory();
      return;
    }
    
    if (levelUpTriggered > 0) {
      this.pendingLevelUps += levelUpTriggered;
    }
    
    if (this.pendingLevelUps > 0 && this.isRunning) {
      this.pendingLevelUps--;
      this.isRunning = false;
      this.onLevelUp(getRandomUpgrades(3));
    }
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    
    for (let i = this.texts.length - 1; i >= 0; i--) {
      let t = this.texts[i];
      t.y -= 20 * dt;
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }
  
  shoot() {
    let target = this.findNearestSegment(this.player.x, this.player.y, new Set());
    if (!target) return;
    
    let dx = target.x - this.player.x;
    let dy = target.y - this.player.y;
    let baseAngle = Math.atan2(dy, dx);
    
    let ms = this.stats.multishot;
    let spread = 0.15;
    let startAngle = baseAngle - (ms - 1) * spread / 2;
    
    for (let i = 0; i < ms; i++) {
      let a = startAngle + i * spread;
      this.projectiles.push({
        id: this.nextId++,
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(a) * this.stats.projectileSpeed,
        vy: Math.sin(a) * this.stats.projectileSpeed,
        pierce: this.stats.pierce,
        bounce: this.stats.bounce,
        hitSegments: new Set(),
        life: 5
      });
    }
  }
  
  handleHit(p: Projectile, s: Snake, seg: Segment) {
    p.hitSegments.add(seg.id);
    
    let dmg = this.stats.damage;
    let isCrit = Math.random() < this.stats.critChance;
    if (isCrit) dmg *= this.stats.critDamage;
    
    this.damageSegment(seg, dmg, isCrit, isCrit ? '#ffaa00' : '#ffffff');
    
    if (this.stats.explosive) {
      this.createExplosion(seg.x, seg.y, this.stats.explosiveRadius, dmg * this.stats.explosiveDamageMult);
    }
    
    if (this.stats.lightning) {
      this.triggerLightning(seg.x, seg.y, dmg * this.stats.lightningDamageMult, this.stats.lightningChains, new Set([seg.id]));
    }
    
    if (this.stats.poison) {
      seg.poisonStacks++;
    }
    
    if (p.pierce > 0) {
      p.pierce--;
    } else if (p.bounce > 0) {
      p.bounce--;
      let nextTarget = this.findNearestSegment(p.x, p.y, p.hitSegments);
      if (nextTarget) {
        let dx = nextTarget.x - p.x;
        let dy = nextTarget.y - p.y;
        let dist = Math.hypot(dx, dy);
        p.vx = (dx / dist) * this.stats.projectileSpeed;
        p.vy = (dy / dist) * this.stats.projectileSpeed;
      } else {
        p.life = 0;
      }
    } else {
      p.life = 0;
    }
  }
  
  damageSegment(seg: Segment, amount: number, isCrit: boolean, color: string) {
    if (seg.dead) return;
    seg.hp -= amount;
    
    this.texts.push({
      x: seg.x + (Math.random()-0.5)*20,
      y: seg.y - 10,
      text: amount.toFixed(0) + (isCrit ? '!' : ''),
      life: 0.8,
      maxLife: 0.8,
      color: color
    });
    
    if (seg.hp <= 0) {
      seg.dead = true;
      this.score += seg.isSpecial ? 30 : 1;
      this.onScoreUpdate(this.score);
      
      for(let i=0; i<10; i++) {
        let a = Math.random() * Math.PI * 2;
        let s = Math.random() * 50;
        this.particles.push({
          x: seg.x, y: seg.y,
          vx: Math.cos(a)*s, vy: Math.sin(a)*s,
          life: 0.5, maxLife: 0.5,
          color: seg.isSpecial ? '#ffaa00' : '#888',
          size: 2 + Math.random()*3
        });
      }
    }
  }
  
  createExplosion(x: number, y: number, radius: number, damage: number) {
    for(let i=0; i<20; i++) {
      let a = Math.random() * Math.PI * 2;
      let s = Math.random() * 100;
      this.particles.push({
        x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s,
        life: 0.3, maxLife: 0.3, color: '#ff5500', size: 3 + Math.random()*3
      });
    }
    
    for (let s of this.snakes) {
      for (let seg of s.segments) {
        if (seg.dead) continue;
        if (Math.hypot(seg.x - x, seg.y - y) <= radius) {
          this.damageSegment(seg, damage, false, '#ff5500');
        }
      }
    }
  }
  
  triggerLightning(x: number, y: number, damage: number, chains: number, hitIds: Set<number>) {
    if (chains <= 0) return;
    
    let target = this.findNearestSegment(x, y, hitIds, 200);
    if (target) {
      hitIds.add(target.id);
      this.damageSegment(target, damage, false, '#00ffff');
      
      for(let i=0; i<5; i++) {
        this.particles.push({
          x: x + (target.x - x)*(i/5),
          y: y + (target.y - y)*(i/5),
          vx: (Math.random()-0.5)*20, vy: (Math.random()-0.5)*20,
          life: 0.2, maxLife: 0.2, color: '#00ffff', size: 2
        });
      }
      
      this.triggerLightning(target.x, target.y, damage, chains - 1, hitIds);
    }
  }
  
  findNearestSegment(x: number, y: number, ignoreIds: Set<number>, maxDist: number = Infinity): Segment | null {
    let nearest = null;
    let minDist = maxDist;
    for (let s of this.snakes) {
      for (let seg of s.segments) {
        if (seg.dead || ignoreIds.has(seg.id)) continue;
        let d = Math.hypot(seg.x - x, seg.y - y);
        if (d < minDist) {
          minDist = d;
          nearest = seg;
        }
      }
    }
    return nearest;
  }
  
  draw() {
    let ctx = this.ctx;
    let w = this.canvas.width;
    let h = this.canvas.height;
    
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);
    
    ctx.save();
    ctx.translate(w/2 - this.camera.x, h/2 - this.camera.y);
    
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    let gridSize = 100;
    let startX = Math.floor((this.camera.x - w/2) / gridSize) * gridSize;
    let startY = Math.floor((this.camera.y - h/2) / gridSize) * gridSize;
    for (let x = startX; x < this.camera.x + w/2; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, this.camera.y - h/2); ctx.lineTo(x, this.camera.y + h/2); ctx.stroke();
    }
    for (let y = startY; y < this.camera.y + h/2; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(this.camera.x - w/2, y); ctx.lineTo(this.camera.x + w/2, y); ctx.stroke();
    }
    
    for (let s of this.snakes) {
      ctx.beginPath();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 4;
      for (let i = 0; i < s.segments.length; i++) {
        let seg = s.segments[i];
        if (i === 0) ctx.moveTo(seg.x, seg.y);
        else ctx.lineTo(seg.x, seg.y);
      }
      ctx.stroke();
      
      for (let seg of s.segments) {
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, seg.isSpecial ? 18 : 10, 0, Math.PI * 2);
        ctx.fillStyle = seg.isSpecial ? '#ffaa00' : (seg.poisonStacks > 0 ? '#55ff55' : '#555');
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        if (seg.isSpecial) {
          ctx.fillStyle = '#f00';
          ctx.fillRect(seg.x - 15, seg.y - 25, 30, 4);
          ctx.fillStyle = '#0f0';
          ctx.fillRect(seg.x - 15, seg.y - 25, 30 * (seg.hp / seg.maxHp), 4);
        }
      }
    }
    
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#00aaff';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    for (let p of this.projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffff00';
      ctx.fill();
    }
    
    for (let p of this.particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    
    for (let t of this.texts) {
      ctx.fillStyle = t.color;
      ctx.globalAlpha = t.life / t.maxLife;
      ctx.font = 'bold 16px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
      ctx.globalAlpha = 1;
    }
    
    ctx.restore();
  }
}
