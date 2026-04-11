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
    const bob = Math.sin(this.phase * 0.7) * 2;

    ctx.save();
    ctx.translate(this.x, this.y + bob);

    // Outer glow
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size * 1.5);
    grad.addColorStop(0, this.def.color + '44');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Diamond container
    ctx.shadowColor = this.def.color;
    ctx.shadowBlur = 8 * pulse;
    ctx.fillStyle = this.def.color + 'cc';
    ctx.strokeStyle = this.def.color;
    ctx.lineWidth = 1.5;

    const s = this.size * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner fill
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.6);
    ctx.lineTo(s * 0.6, 0);
    ctx.lineTo(0, s * 0.6);
    ctx.lineTo(-s * 0.6, 0);
    ctx.closePath();
    ctx.fill();

    // Glyph
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.def.glyph, 0, 0);

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
