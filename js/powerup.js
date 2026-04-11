// Power-up system - drops from destroyed shards
import { CONFIG } from './config.js';

export const POWERUP_TYPES = {
  RAPID_FIRE: 'rapid_fire',
  SPREAD_SHOT: 'spread_shot',
  SHIELD: 'shield',
  EXTRA_LIFE: 'extra_life',
  SCORE_BURST: 'score_burst',
};

const POWERUP_DEFS = {
  [POWERUP_TYPES.RAPID_FIRE]: {
    color: '#ff4444',
    glyph: 'R',
    duration: 6000,
    description: 'RAPID FIRE',
  },
  [POWERUP_TYPES.SPREAD_SHOT]: {
    color: '#44aaff',
    glyph: 'S',
    duration: 7000,
    description: 'SPREAD SHOT',
  },
  [POWERUP_TYPES.SHIELD]: {
    color: '#00e5ff',
    glyph: 'H',
    duration: 5000,
    description: 'SHIELD',
  },
  [POWERUP_TYPES.EXTRA_LIFE]: {
    color: '#00ff88',
    glyph: '+',
    duration: 0,
    description: 'EXTRA LIFE',
  },
  [POWERUP_TYPES.SCORE_BURST]: {
    color: '#ffe033',
    glyph: '$',
    duration: 0,
    description: '+500 POINTS',
  },
};

// Drop chance: ~8% per shard destroyed
const DROP_CHANCE = 0.08;

// Weighted type selection
const TYPE_WEIGHTS = [
  { type: POWERUP_TYPES.RAPID_FIRE, weight: 30 },
  { type: POWERUP_TYPES.SPREAD_SHOT, weight: 25 },
  { type: POWERUP_TYPES.SHIELD, weight: 20 },
  { type: POWERUP_TYPES.SCORE_BURST, weight: 18 },
  { type: POWERUP_TYPES.EXTRA_LIFE, weight: 7 },
];

function pickType() {
  const total = TYPE_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const entry of TYPE_WEIGHTS) {
    r -= entry.weight;
    if (r <= 0) return entry.type;
  }
  return POWERUP_TYPES.RAPID_FIRE;
}

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.size = 14;
    this.vy = 1.2;
    this.alive = true;
    this.phase = Math.random() * Math.PI * 2;
    this.def = POWERUP_DEFS[type];
  }

  update() {
    this.y += this.vy;
    this.phase += 0.06;
    this.rotation = (this.rotation || 0) + 0.02;
    if (this.y > CONFIG.GAME_HEIGHT + 20) {
      this.alive = false;
    }
  }

  get hitbox() {
    return {
      x: this.x - this.size,
      y: this.y - this.size,
      width: this.size * 2,
      height: this.size * 2,
    };
  }

  render(ctx) {
    const pulse = 0.7 + Math.sin(this.phase) * 0.3;
    const bob = Math.sin(this.phase * 0.7) * 3;
    const rot = this.rotation || 0;

    ctx.save();
    ctx.translate(this.x, this.y + bob);

    // Sparkle trail particles (drawn behind)
    for (let i = 0; i < 3; i++) {
      const age = (this.phase + i * 0.8) % (Math.PI * 2);
      const sparkAlpha = 0.15 + Math.sin(age) * 0.15;
      const sx = Math.sin(age * 1.3 + i) * 6;
      const sy = 4 + i * 3 + Math.sin(age) * 2;
      ctx.fillStyle = this.def.color;
      ctx.globalAlpha = sparkAlpha;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + Math.sin(age) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Outer glow — larger, multi-stop
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 2);
    grad.addColorStop(0, this.def.color + '55');
    grad.addColorStop(0.4, this.def.color + '22');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 2, 0, Math.PI * 2);
    ctx.fill();

    // Spinning rotation
    ctx.rotate(rot);

    // Diamond container — richer gradient fill
    ctx.shadowColor = this.def.color;
    ctx.shadowBlur = 10 * pulse;

    const s = this.size * 0.85;
    const diamGrad = ctx.createLinearGradient(-s, -s, s, s);
    diamGrad.addColorStop(0, this.def.color + 'ff');
    diamGrad.addColorStop(0.5, this.def.color + 'cc');
    diamGrad.addColorStop(1, this.def.color + '88');
    ctx.fillStyle = diamGrad;
    ctx.strokeStyle = this.def.color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Facet highlights
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(-s, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.lineTo(s, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // Inner diamond
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.55);
    ctx.lineTo(s * 0.55, 0);
    ctx.lineTo(0, s * 0.55);
    ctx.lineTo(-s * 0.55, 0);
    ctx.closePath();
    ctx.fill();

    // Inner glow core
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.4);
    coreGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Glyph with shadow
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = this.def.color;
    ctx.shadowBlur = 4;
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.def.glyph, 0, 0);
    ctx.shadowBlur = 0;

    // Corner sparkles
    const corners = [[0, -s], [s, 0], [0, s], [-s, 0]];
    for (let i = 0; i < 4; i++) {
      const sparkle = 0.3 + Math.sin(this.phase * 2 + i * Math.PI / 2) * 0.3;
      ctx.fillStyle = `rgba(255, 255, 255, ${sparkle})`;
      ctx.beginPath();
      ctx.arc(corners[i][0], corners[i][1], 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class PowerUpManager {
  constructor() {
    this.items = [];
    this.activeEffects = {}; // type -> remaining ms
  }

  // Called when a shard is destroyed - maybe spawn a power-up
  trySpawn(x, y) {
    if (Math.random() < DROP_CHANCE) {
      this.items.push(new PowerUp(x, y, pickType()));
    }
  }

  update(dt) {
    for (const p of this.items) {
      p.update();
    }
    this.items = this.items.filter(p => p.alive);

    // Tick active effects
    for (const type of Object.keys(this.activeEffects)) {
      this.activeEffects[type] -= dt;
      if (this.activeEffects[type] <= 0) {
        delete this.activeEffects[type];
      }
    }
  }

  // Check if player picked up a power-up; returns collected item or null
  checkCollection(playerHitbox) {
    for (const p of this.items) {
      if (!p.alive) continue;
      if (rectsOverlap(playerHitbox, p.hitbox)) {
        p.alive = false;
        return p;
      }
    }
    return null;
  }

  activateEffect(type) {
    const def = POWERUP_DEFS[type];
    if (def.duration > 0) {
      this.activeEffects[type] = def.duration;
    }
  }

  hasEffect(type) {
    return (this.activeEffects[type] || 0) > 0;
  }

  render(ctx) {
    for (const p of this.items) {
      p.render(ctx);
    }
  }

  clear() {
    this.items = [];
    this.activeEffects = {};
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}
