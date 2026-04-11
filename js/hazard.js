// Additional hazard/enemy types
import { CONFIG } from './config.js';

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

// Drifting energy orb
export class EnergyOrb extends Hazard {
  constructor(x, y) {
    super(x, y, 'orb');
    this.size = CONFIG.HAZARD_ORB_SIZE;
    this.vx = (Math.random() - 0.5) * CONFIG.HAZARD_ORB_SPEED;
    this.vy = CONFIG.HAZARD_ORB_SPEED * (0.5 + Math.random() * 0.5);
    this.amplitude = 30 + Math.random() * 20;
    this.baseX = x;
    this.time = 0;
    this.ringPhase = Math.random() * Math.PI * 2;
  }

  update() {
    this.time += 0.03;
    this.x = this.baseX + Math.sin(this.time * 2) * this.amplitude;
    this.baseX += this.vx * 0.3;
    this.y += this.vy;
    this.phase += 0.05;
    this.ringPhase += 0.04;

    if (this.y > CONFIG.GAME_HEIGHT + 20 ||
        this.x < -30 || this.x > CONFIG.GAME_WIDTH + 30) {
      this.alive = false;
    }
  }

  render(ctx) {
    const pulse = 0.7 + Math.sin(this.phase) * 0.3;
    ctx.save();

    // Orbiting ring
    ctx.strokeStyle = `rgba(255, 145, 0, ${0.15 + pulse * 0.15})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(this.x, this.y, this.size * 1.4, this.size * 0.5,
                this.ringPhase, 0, Math.PI * 2);
    ctx.stroke();

    // Outer aura
    ctx.shadowColor = CONFIG.COLORS.HAZARD_ORB;
    ctx.shadowBlur = 15 * pulse;
    const outerGrad = ctx.createRadialGradient(
      this.x, this.y, 0, this.x, this.y, this.size * 1.3
    );
    outerGrad.addColorStop(0, `rgba(255, 145, 0, ${0.5 * pulse})`);
    outerGrad.addColorStop(0.4, `rgba(255, 100, 0, ${0.3 * pulse})`);
    outerGrad.addColorStop(0.8, `rgba(255, 60, 0, ${0.1 * pulse})`);
    outerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Main orb body
    const bodyGrad = ctx.createRadialGradient(
      this.x - this.size * 0.2, this.y - this.size * 0.2, 0,
      this.x, this.y, this.size * 0.8
    );
    bodyGrad.addColorStop(0, '#ffdd88');
    bodyGrad.addColorStop(0.4, CONFIG.COLORS.HAZARD_ORB);
    bodyGrad.addColorStop(1, '#cc5500');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Hot core
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.x - 1, this.y - 1, this.size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Specular
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(this.x - this.size * 0.2, this.y - this.size * 0.25,
                this.size * 0.15, this.size * 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// Bouncing ricochet hazard
export class RicochetHazard extends Hazard {
  constructor(x, y) {
    super(x, y, 'ricochet');
    this.size = CONFIG.HAZARD_RICOCHET_SIZE;
    const angle = Math.random() * Math.PI * 0.5 + Math.PI * 0.25;
    this.vx = Math.cos(angle) * CONFIG.HAZARD_RICOCHET_SPEED * (Math.random() < 0.5 ? 1 : -1);
    this.vy = Math.sin(angle) * CONFIG.HAZARD_RICOCHET_SPEED;
    this.bounces = 0;
    this.maxBounces = 5;
    this.rotation = 0;
    this.trailPositions = [];
  }

  update() {
    // Store trail
    this.trailPositions.push({ x: this.x, y: this.y });
    if (this.trailPositions.length > 6) this.trailPositions.shift();

    this.x += this.vx;
    this.y += this.vy;
    this.rotation += 0.15;
    this.phase += 0.08;

    if (this.x - this.size / 2 <= 0 || this.x + this.size / 2 >= CONFIG.GAME_WIDTH) {
      this.vx *= -1;
      this.x = Math.max(this.size / 2, Math.min(CONFIG.GAME_WIDTH - this.size / 2, this.x));
      this.bounces++;
    }

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

    // Motion trail
    for (let i = 0; i < this.trailPositions.length; i++) {
      const t = this.trailPositions[i];
      const alpha = (i / this.trailPositions.length) * 0.25;
      const sz = (this.size / 2) * (i / this.trailPositions.length) * 0.6;
      ctx.fillStyle = `rgba(255, 23, 68, ${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowColor = CONFIG.COLORS.HAZARD_RICOCHET;
    ctx.shadowBlur = 10;

    // Outer spike ring
    const s = this.size / 2;
    const spikeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    spikeGrad.addColorStop(0, '#ff6680');
    spikeGrad.addColorStop(0.5, CONFIG.COLORS.HAZARD_RICOCHET);
    spikeGrad.addColorStop(1, '#aa0022');
    ctx.fillStyle = spikeGrad;

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI / 4) * i;
      const outerR = i % 2 === 0 ? s : s * 0.4;
      ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    }
    ctx.closePath();
    ctx.fill();

    // Edge highlight
    ctx.strokeStyle = 'rgba(255, 180, 180, 0.4)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Center bright dot
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
    ctx.fill();

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
    this.state = 'approach';
    this.approachY = 60 + Math.random() * 80;
    this.waitTimer = 0;
    this.wingPhase = 0;
  }

  setTarget(playerX) {
    this.targetX = playerX;
  }

  update() {
    this.phase += 0.06;
    this.wingPhase += 0.12;

    if (this.state === 'approach') {
      this.y += this.vy * 0.5;
      if (this.y >= this.approachY) {
        this.state = 'hover';
        this.waitTimer = 40;
      }
    } else if (this.state === 'hover') {
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
    const s = this.size / 2;
    const wingFlap = Math.sin(this.wingPhase) * 0.15;

    ctx.shadowColor = CONFIG.COLORS.HAZARD_DIVER;
    ctx.shadowBlur = 10;

    // Warning line when hovering
    if (this.state === 'hover') {
      ctx.globalAlpha = 0.15 + Math.sin(this.phase * 4) * 0.15;
      const warnGrad = ctx.createLinearGradient(this.x, this.y + s, this.x, CONFIG.GAME_HEIGHT);
      warnGrad.addColorStop(0, CONFIG.COLORS.HAZARD_DIVER);
      warnGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = warnGrad;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + s);
      ctx.lineTo(this.x, CONFIG.GAME_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Target reticle
      ctx.strokeStyle = `rgba(255, 234, 0, ${0.3 + Math.sin(this.phase * 4) * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, CONFIG.GAME_HEIGHT - CONFIG.PLAYER_Y_OFFSET, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Body - angular diving shape
    ctx.translate(this.x, this.y);

    // Wing glow
    const wingSpan = s * 1.2;
    ctx.fillStyle = `rgba(255, 234, 0, ${0.15 + Math.sin(this.wingPhase) * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(-wingSpan, -s * 0.2 + wingFlap * s);
    ctx.lineTo(0, s * 0.1);
    ctx.lineTo(wingSpan, -s * 0.2 - wingFlap * s);
    ctx.lineTo(0, -s * 0.5);
    ctx.closePath();
    ctx.fill();

    // Main body
    const bodyGrad = ctx.createLinearGradient(0, -s, 0, s);
    bodyGrad.addColorStop(0, '#ffee66');
    bodyGrad.addColorStop(0.4, CONFIG.COLORS.HAZARD_DIVER);
    bodyGrad.addColorStop(1, '#cc9900');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(0, s * 1.1);       // Nose (pointing down)
    ctx.lineTo(-s * 0.8, -s * 0.4);
    ctx.lineTo(-s * 0.3, -s * 0.6);
    ctx.lineTo(0, -s * 0.3);
    ctx.lineTo(s * 0.3, -s * 0.6);
    ctx.lineTo(s * 0.8, -s * 0.4);
    ctx.closePath();
    ctx.fill();

    // Edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 200, 0.4)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Engine glow at top
    ctx.shadowBlur = 0;
    const engPulse = 0.5 + Math.sin(this.phase * 3) * 0.5;
    ctx.fillStyle = `rgba(255, 100, 0, ${engPulse * 0.6})`;
    ctx.beginPath();
    ctx.arc(0, -s * 0.35, s * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Nose hot point
    if (this.state === 'dive') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = CONFIG.COLORS.HAZARD_DIVER;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, s * 0.9, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}


export class HazardManager {
  constructor() {
    this.hazards = [];
    this.spawnTimer = 0;
    this.spawnInterval = CONFIG.HAZARD_SPAWN_INTERVAL_BASE;
  }

  update(wave, playerX, dt) {
    for (const h of this.hazards) {
      if (h.type === 'diver' && h.state === 'hover') {
        h.setTarget(playerX);
      }
      h.update();
    }
    this.hazards = this.hazards.filter(h => h.alive);

    this.spawnTimer += dt;
    const interval = Math.max(
      CONFIG.HAZARD_SPAWN_INTERVAL_MIN,
      this.spawnInterval - wave * 300
    );

    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this._spawnHazard(wave, playerX);
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
    for (const h of this.hazards) {
      h.render(ctx);
    }
  }

  clear() {
    this.hazards = [];
    this.spawnTimer = 0;
  }
}
