// Additional hazard/enemy types
import { CONFIG } from './config.js';

// Base hazard class
class Hazard {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.alive = true;
    this.phase = Math.random() * Math.PI * 2;
  }

  get centerX() { return this.x; }
  get centerY() { return this.y; }

  get hitbox() {
    const s = this.size;
    return { x: this.x - s / 2, y: this.y - s / 2, width: s, height: s };
  }
}

// Drifting energy orb - moves in a slow sine wave pattern
export class EnergyOrb extends Hazard {
  constructor(x, y) {
    super(x, y, 'orb');
    this.size = CONFIG.HAZARD_ORB_SIZE;
    this.vx = (Math.random() - 0.5) * CONFIG.HAZARD_ORB_SPEED;
    this.vy = CONFIG.HAZARD_ORB_SPEED * (0.5 + Math.random() * 0.5);
    this.amplitude = 30 + Math.random() * 20;
    this.baseX = x;
    this.time = 0;
  }

  update() {
    this.time += 0.03;
    this.x = this.baseX + Math.sin(this.time * 2) * this.amplitude;
    this.baseX += this.vx * 0.3;
    this.y += this.vy;
    this.phase += 0.05;

    if (this.y > CONFIG.GAME_HEIGHT + 20 ||
        this.x < -30 || this.x > CONFIG.GAME_WIDTH + 30) {
      this.alive = false;
    }
  }

  render(ctx) {
    const pulse = 0.7 + Math.sin(this.phase) * 0.3;
    ctx.save();
    ctx.shadowColor = CONFIG.COLORS.HAZARD_ORB;
    ctx.shadowBlur = 12 * pulse;

    // Outer glow
    const grad = ctx.createRadialGradient(
      this.x, this.y, 0, this.x, this.y, this.size
    );
    grad.addColorStop(0, CONFIG.COLORS.HAZARD_ORB);
    grad.addColorStop(0.6, CONFIG.COLORS.HAZARD_ORB + '88');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// Bouncing ricochet hazard - bounces off walls
export class RicochetHazard extends Hazard {
  constructor(x, y) {
    super(x, y, 'ricochet');
    this.size = CONFIG.HAZARD_RICOCHET_SIZE;
    const angle = Math.random() * Math.PI * 0.5 + Math.PI * 0.25; // mostly downward
    this.vx = Math.cos(angle) * CONFIG.HAZARD_RICOCHET_SPEED * (Math.random() < 0.5 ? 1 : -1);
    this.vy = Math.sin(angle) * CONFIG.HAZARD_RICOCHET_SPEED;
    this.bounces = 0;
    this.maxBounces = 5;
    this.rotation = 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += 0.15;
    this.phase += 0.08;

    // Bounce off walls
    if (this.x - this.size / 2 <= 0 || this.x + this.size / 2 >= CONFIG.GAME_WIDTH) {
      this.vx *= -1;
      this.x = Math.max(this.size / 2, Math.min(CONFIG.GAME_WIDTH - this.size / 2, this.x));
      this.bounces++;
    }

    // Bounce off top
    if (this.y - this.size / 2 <= 0) {
      this.vy = Math.abs(this.vy);
      this.bounces++;
    }

    if (this.y > CONFIG.GAME_HEIGHT + 20 || this.bounces > this.maxBounces) {
      this.alive = false;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowColor = CONFIG.COLORS.HAZARD_RICOCHET;
    ctx.shadowBlur = 8;
    ctx.fillStyle = CONFIG.COLORS.HAZARD_RICOCHET;

    // Star/spike shape
    const s = this.size / 2;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI / 2) * i;
      ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
      ctx.lineTo(Math.cos(angle + Math.PI / 4) * s * 0.4,
                 Math.sin(angle + Math.PI / 4) * s * 0.4);
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// Fast diving enemy
export class DivingEnemy extends Hazard {
  constructor(x) {
    super(x, -20, 'diver');
    this.size = CONFIG.HAZARD_DIVER_SIZE;
    this.vy = CONFIG.HAZARD_DIVER_SPEED;
    this.vx = 0;
    this.targetX = x;
    this.state = 'approach'; // 'approach' -> 'dive'
    this.approachY = 60 + Math.random() * 80;
    this.waitTimer = 0;
  }

  setTarget(playerX) {
    this.targetX = playerX;
  }

  update() {
    this.phase += 0.06;

    if (this.state === 'approach') {
      this.y += this.vy * 0.5;
      if (this.y >= this.approachY) {
        this.state = 'hover';
        this.waitTimer = 40;
      }
    } else if (this.state === 'hover') {
      // Drift toward target X
      const diff = this.targetX - this.x;
      this.x += Math.sign(diff) * Math.min(Math.abs(diff), 2);
      this.waitTimer--;
      if (this.waitTimer <= 0) {
        this.state = 'dive';
      }
    } else if (this.state === 'dive') {
      this.vy += 0.15;
      this.y += this.vy;
    }

    if (this.y > CONFIG.GAME_HEIGHT + 30) {
      this.alive = false;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.shadowColor = CONFIG.COLORS.HAZARD_DIVER;
    ctx.shadowBlur = 8;
    ctx.fillStyle = CONFIG.COLORS.HAZARD_DIVER;

    // Arrow/chevron shape pointing down
    const s = this.size / 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + s);
    ctx.lineTo(this.x - s, this.y - s * 0.5);
    ctx.lineTo(this.x - s * 0.3, this.y - s * 0.2);
    ctx.lineTo(this.x, this.y + s * 0.3);
    ctx.lineTo(this.x + s * 0.3, this.y - s * 0.2);
    ctx.lineTo(this.x + s, this.y - s * 0.5);
    ctx.closePath();
    ctx.fill();

    // Warning indicator when hovering
    if (this.state === 'hover') {
      ctx.globalAlpha = 0.3 + Math.sin(this.phase * 3) * 0.3;
      ctx.strokeStyle = CONFIG.COLORS.HAZARD_DIVER;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + s);
      ctx.lineTo(this.x, CONFIG.GAME_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// Corruption field - rises from bottom, pressures the player upward
export class CorruptionField {
  constructor() {
    this.height = 0;
    this.active = false;
    this.maxHeight = 120;
    this.riseSpeed = CONFIG.HAZARD_CORRUPTION_RISE_SPEED;
    this.phase = 0;
  }

  activate() {
    this.active = true;
  }

  deactivate() {
    this.active = false;
  }

  update() {
    if (this.active) {
      this.height = Math.min(this.height + this.riseSpeed, this.maxHeight);
    } else {
      this.height = Math.max(this.height - this.riseSpeed * 2, 0);
    }
    this.phase += 0.03;
  }

  get topY() {
    return CONFIG.GAME_HEIGHT - this.height;
  }

  // Check if a point is inside the corruption
  contains(x, y) {
    return this.height > 0 && y >= this.topY;
  }

  render(ctx) {
    if (this.height <= 0) return;

    ctx.save();
    const y = this.topY;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, y, 0, CONFIG.GAME_HEIGHT);
    grad.addColorStop(0, 'rgba(170, 0, 255, 0.1)');
    grad.addColorStop(0.3, 'rgba(170, 0, 255, 0.25)');
    grad.addColorStop(1, 'rgba(170, 0, 255, 0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, y, CONFIG.GAME_WIDTH, this.height);

    // Wavy top edge
    ctx.strokeStyle = CONFIG.COLORS.HAZARD_CORRUPTION;
    ctx.lineWidth = 2;
    ctx.shadowColor = CONFIG.COLORS.HAZARD_CORRUPTION;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let x = 0; x <= CONFIG.GAME_WIDTH; x += 4) {
      const wave = Math.sin(x * 0.03 + this.phase) * 4 +
                   Math.sin(x * 0.07 + this.phase * 1.5) * 2;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

export class HazardManager {
  constructor() {
    this.hazards = [];
    this.corruption = new CorruptionField();
    this.spawnTimer = 0;
    this.spawnInterval = CONFIG.HAZARD_SPAWN_INTERVAL_BASE;
    this.corruptionTimer = 0;
    this.corruptionInterval = 18000;
    this.corruptionDuration = 10000;
  }

  update(wave, playerX, dt) {
    // Update existing hazards
    for (const h of this.hazards) {
      if (h.type === 'diver' && h.state === 'hover') {
        h.setTarget(playerX);
      }
      h.update();
    }
    this.hazards = this.hazards.filter(h => h.alive);

    // Update corruption
    this.corruption.update();

    // Spawn timer
    this.spawnTimer += dt;
    const interval = Math.max(
      CONFIG.HAZARD_SPAWN_INTERVAL_MIN,
      this.spawnInterval - wave * 300
    );

    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this._spawnHazard(wave, playerX);
    }

    // Corruption timer (starts appearing at wave 3)
    if (wave >= 3) {
      this.corruptionTimer += dt;
      if (!this.corruption.active && this.corruptionTimer >= this.corruptionInterval) {
        this.corruption.activate();
        this.corruptionTimer = 0;
      } else if (this.corruption.active && this.corruptionTimer >= this.corruptionDuration) {
        this.corruption.deactivate();
        this.corruptionTimer = 0;
      }
    }
  }

  _spawnHazard(wave, playerX) {
    const roll = Math.random();
    const x = 30 + Math.random() * (CONFIG.GAME_WIDTH - 60);

    if (wave >= 3 && roll < 0.3) {
      this.hazards.push(new DivingEnemy(playerX + (Math.random() - 0.5) * 80));
    } else if (wave >= 2 && roll < 0.55) {
      this.hazards.push(new RicochetHazard(x, -10));
    } else {
      this.hazards.push(new EnergyOrb(x, -10));
    }
  }

  render(ctx) {
    this.corruption.render(ctx);
    for (const h of this.hazards) {
      h.render(ctx);
    }
  }

  clear() {
    this.hazards = [];
    this.corruption = new CorruptionField();
    this.spawnTimer = 0;
    this.corruptionTimer = 0;
  }
}
