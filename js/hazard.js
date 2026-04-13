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

  update(timeScale = 1) {
    this.time += 0.03 * timeScale;
    this.x = this.baseX + Math.sin(this.time * 2) * this.amplitude;
    this.baseX += this.vx * 0.3 * timeScale;
    this.y += this.vy * timeScale;
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

    // Danger aura — pulsing warning ring
    const dangerAlpha = 0.08 + Math.sin(this.phase * 2) * 0.06;
    const dangerGrad = ctx.createRadialGradient(this.x, this.y, this.size, this.x, this.y, this.size * 2.5);
    dangerGrad.addColorStop(0, `rgba(255, 100, 0, ${dangerAlpha})`);
    dangerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = dangerGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Double orbiting rings
    for (let r = 0; r < 2; r++) {
      const rPhase = this.ringPhase + r * Math.PI * 0.5;
      const rAlpha = 0.12 + pulse * 0.12 - r * 0.06;
      ctx.strokeStyle = `rgba(255, 145, 0, ${rAlpha})`;
      ctx.lineWidth = 0.8 - r * 0.3;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.size * (1.4 + r * 0.3), this.size * (0.5 + r * 0.15),
                  rPhase, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Outer aura
    ctx.shadowColor = CONFIG.COLORS.HAZARD_ORB;
    ctx.shadowBlur = 18 * pulse;
    const outerGrad = ctx.createRadialGradient(
      this.x, this.y, 0, this.x, this.y, this.size * 1.4
    );
    outerGrad.addColorStop(0, `rgba(255, 160, 30, ${0.55 * pulse})`);
    outerGrad.addColorStop(0.35, `rgba(255, 100, 0, ${0.35 * pulse})`);
    outerGrad.addColorStop(0.7, `rgba(255, 50, 0, ${0.12 * pulse})`);
    outerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Main orb body — richer gradient
    const bodyGrad = ctx.createRadialGradient(
      this.x - this.size * 0.2, this.y - this.size * 0.2, 0,
      this.x, this.y, this.size * 0.8
    );
    bodyGrad.addColorStop(0, '#ffeeaa');
    bodyGrad.addColorStop(0.3, '#ffdd66');
    bodyGrad.addColorStop(0.6, CONFIG.COLORS.HAZARD_ORB);
    bodyGrad.addColorStop(1, '#aa4400');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Surface texture — small bright arcs
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255, 220, 150, ${0.2 + pulse * 0.15})`;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const a = this.phase * 0.8 + i * Math.PI * 0.7;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.5, a, a + 0.6);
      ctx.stroke();
    }

    // Hot core
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(this.x - 1, this.y - 1, this.size * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Specular glint
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.ellipse(this.x - this.size * 0.2, this.y - this.size * 0.28,
                this.size * 0.16, this.size * 0.07, -0.4, 0, Math.PI * 2);
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

  update(timeScale = 1) {
    // Store trail
    this.trailPositions.push({ x: this.x, y: this.y });
    if (this.trailPositions.length > 6) this.trailPositions.shift();

    this.x += this.vx * timeScale;
    this.y += this.vy * timeScale;
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

    // Motion trail — gradient-faded streak
    if (this.trailPositions.length > 1) {
      for (let i = 1; i < this.trailPositions.length; i++) {
        const t0 = this.trailPositions[i - 1];
        const t1 = this.trailPositions[i];
        const alpha = (i / this.trailPositions.length) * 0.35;
        const sz = (this.size / 2) * (i / this.trailPositions.length) * 0.7;
        // Line segment trail
        ctx.strokeStyle = `rgba(255, 23, 68, ${alpha})`;
        ctx.lineWidth = sz * 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(t0.x, t0.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.stroke();
      }
      // Glow around latest trail
      const last = this.trailPositions[this.trailPositions.length - 1];
      const tGlow = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, this.size);
      tGlow.addColorStop(0, 'rgba(255, 23, 68, 0.1)');
      tGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = tGlow;
      ctx.beginPath();
      ctx.arc(last.x, last.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowColor = CONFIG.COLORS.HAZARD_RICOCHET;
    ctx.shadowBlur = 12;

    // Outer spike ring — 12 spikes for more detail
    const s = this.size / 2;
    const spikeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s);
    spikeGrad.addColorStop(0, '#ff8899');
    spikeGrad.addColorStop(0.4, '#ff4466');
    spikeGrad.addColorStop(0.7, CONFIG.COLORS.HAZARD_RICOCHET);
    spikeGrad.addColorStop(1, '#880015');
    ctx.fillStyle = spikeGrad;

    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i;
      const outerR = i % 2 === 0 ? s : s * 0.45;
      ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    }
    ctx.closePath();
    ctx.fill();

    // Edge highlight
    ctx.strokeStyle = 'rgba(255, 200, 200, 0.35)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Inner ring detail
    ctx.strokeStyle = 'rgba(255, 100, 130, 0.3)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    // Center bright dot with glow
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff4466';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
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
    this.state = 'approach';
    this.approachY = 60 + Math.random() * 80;
    this.waitTimer = 0;
    this.wingPhase = 0;
  }

  setTarget(playerX) {
    this.targetX = playerX;
  }

  update(timeScale = 1) {
    this.phase += 0.06;
    this.wingPhase += 0.12;

    if (this.state === 'approach') {
      this.y += this.vy * 0.5 * timeScale;
      if (this.y >= this.approachY) {
        this.state = 'hover';
        this.waitTimer = 40;
      }
    } else if (this.state === 'hover') {
      const diff = this.targetX - this.x;
      this.x += Math.sign(diff) * Math.min(Math.abs(diff), 2) * timeScale;
      this.waitTimer -= timeScale;
      if (this.waitTimer <= 0) {
        this.state = 'dive';
      }
    } else if (this.state === 'dive') {
      this.vy += 0.15 * timeScale;
      this.y += this.vy * timeScale;
    }

    if (this.y > CONFIG.GAME_HEIGHT + 30) {
      this.alive = false;
    }
  }

  render(ctx) {
    ctx.save();
    const s = this.size / 2;
    const wingFlap = Math.sin(this.wingPhase) * 0.18;

    ctx.shadowColor = CONFIG.COLORS.HAZARD_DIVER;
    ctx.shadowBlur = 12;

    // Warning line when hovering — enhanced with pulsing crosshair
    if (this.state === 'hover') {
      const warnPulse = 0.15 + Math.sin(this.phase * 4) * 0.15;
      ctx.globalAlpha = warnPulse;

      // Laser-line beam
      const warnGrad = ctx.createLinearGradient(this.x, this.y + s, this.x, CONFIG.GAME_HEIGHT);
      warnGrad.addColorStop(0, CONFIG.COLORS.HAZARD_DIVER);
      warnGrad.addColorStop(0.5, '#ff660066');
      warnGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = warnGrad;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -this.phase * 8;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + s);
      ctx.lineTo(this.x, CONFIG.GAME_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Target reticle — double ring + crosshair
      const retAlpha = 0.3 + Math.sin(this.phase * 4) * 0.2;
      const retY = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_Y_OFFSET;
      const retR = 8 + Math.sin(this.phase * 3) * 2;
      ctx.strokeStyle = `rgba(255, 234, 0, ${retAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.x, retY, retR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.x, retY, retR * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      // Crosshair lines
      ctx.beginPath();
      ctx.moveTo(this.x - retR * 1.3, retY);
      ctx.lineTo(this.x - retR * 0.6, retY);
      ctx.moveTo(this.x + retR * 0.6, retY);
      ctx.lineTo(this.x + retR * 1.3, retY);
      ctx.moveTo(this.x, retY - retR * 1.3);
      ctx.lineTo(this.x, retY - retR * 0.6);
      ctx.moveTo(this.x, retY + retR * 0.6);
      ctx.lineTo(this.x, retY + retR * 1.3);
      ctx.stroke();
    }

    ctx.translate(this.x, this.y);

    // Wing glow — layered with energy trail
    const wingSpan = s * 1.3;
    ctx.fillStyle = `rgba(255, 234, 0, ${0.12 + Math.sin(this.wingPhase) * 0.08})`;
    ctx.beginPath();
    ctx.moveTo(-wingSpan, -s * 0.2 + wingFlap * s);
    ctx.lineTo(0, s * 0.15);
    ctx.lineTo(wingSpan, -s * 0.2 - wingFlap * s);
    ctx.lineTo(0, -s * 0.5);
    ctx.closePath();
    ctx.fill();

    // Wing energy lines
    ctx.strokeStyle = `rgba(255, 200, 0, ${0.25 + Math.sin(this.wingPhase) * 0.15})`;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-wingSpan * 0.9, -s * 0.15 + wingFlap * s * 0.8);
    ctx.lineTo(0, s * 0.05);
    ctx.lineTo(wingSpan * 0.9, -s * 0.15 - wingFlap * s * 0.8);
    ctx.stroke();

    // Main body — richer gradient
    const bodyGrad = ctx.createLinearGradient(0, -s, 0, s);
    bodyGrad.addColorStop(0, '#ffee77');
    bodyGrad.addColorStop(0.3, '#ffdd33');
    bodyGrad.addColorStop(0.6, CONFIG.COLORS.HAZARD_DIVER);
    bodyGrad.addColorStop(1, '#bb8800');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(0, s * 1.1);
    ctx.lineTo(-s * 0.85, -s * 0.4);
    ctx.lineTo(-s * 0.35, -s * 0.65);
    ctx.lineTo(0, -s * 0.35);
    ctx.lineTo(s * 0.35, -s * 0.65);
    ctx.lineTo(s * 0.85, -s * 0.4);
    ctx.closePath();
    ctx.fill();

    // Edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 200, 0.35)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Center panel detail
    ctx.fillStyle = 'rgba(200, 150, 0, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, s * 0.8);
    ctx.lineTo(-s * 0.25, -s * 0.2);
    ctx.lineTo(s * 0.25, -s * 0.2);
    ctx.closePath();
    ctx.fill();

    // Engine glow — dual exhausts
    ctx.shadowBlur = 0;
    const engPulse = 0.5 + Math.sin(this.phase * 3) * 0.5;
    ctx.fillStyle = `rgba(255, 120, 0, ${engPulse * 0.7})`;
    ctx.beginPath();
    ctx.arc(-s * 0.2, -s * 0.4, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.2, -s * 0.4, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
    // Engine white core
    ctx.fillStyle = `rgba(255, 255, 200, ${engPulse * 0.5})`;
    ctx.beginPath();
    ctx.arc(-s * 0.2, -s * 0.4, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(s * 0.2, -s * 0.4, s * 0.07, 0, Math.PI * 2);
    ctx.fill();

    // Nose hot point + dive trail
    if (this.state === 'dive') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = CONFIG.COLORS.HAZARD_DIVER;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, s * 0.95, 2, 0, Math.PI * 2);
      ctx.fill();
      // Speed streaks beside body
      ctx.strokeStyle = 'rgba(255, 234, 0, 0.3)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.3);
      ctx.lineTo(-s * 0.6, -s * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.6, -s * 0.3);
      ctx.lineTo(s * 0.6, -s * 1.5);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}


export class HazardManager {
  constructor() {
    this.hazards = [];
    this.telegraphs = []; // pre-spawn warning markers: { x, type, timer, duration }
    this.spawnTimer = 0;
    this.spawnInterval = CONFIG.HAZARD_SPAWN_INTERVAL_BASE;
  }

  update(wave, playerX, dt, timeScale = 1) {
    for (const h of this.hazards) {
      if (h.type === 'diver' && h.state === 'hover') {
        h.setTarget(playerX);
      }
      h.update(timeScale);
    }
    this.hazards = this.hazards.filter(h => h.alive);

    // Tick telegraphs and resolve them when their time expires
    for (const t of this.telegraphs) {
      t.timer -= dt;
      if (t.timer <= 0) {
        this._resolveTelegraph(t);
      }
    }
    this.telegraphs = this.telegraphs.filter(t => t.timer > 0);

    this.spawnTimer += dt;
    const interval = Math.max(
      CONFIG.HAZARD_SPAWN_INTERVAL_MIN,
      this.spawnInterval - wave * 300
    );

    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0;
      this._scheduleHazard(wave, playerX);
    }
  }

  _scheduleHazard(wave, playerX) {
    const roll = Math.random();
    const x = 30 + Math.random() * (CONFIG.GAME_WIDTH - 60);

    if (wave >= 3 && roll < 0.3) {
      // Diver - telegraph above player area for 700ms before spawning
      const targetX = playerX + (Math.random() - 0.5) * 80;
      this.telegraphs.push({
        type: 'diver',
        x: Math.max(20, Math.min(CONFIG.GAME_WIDTH - 20, targetX)),
        timer: 700,
        duration: 700,
      });
    } else if (wave >= 2 && roll < 0.55) {
      this.hazards.push(new RicochetHazard(x, -10));
    } else {
      this.hazards.push(new EnergyOrb(x, -10));
    }
  }

  _resolveTelegraph(t) {
    if (t.type === 'diver') {
      this.hazards.push(new DivingEnemy(t.x));
    }
  }

  render(ctx) {
    // Telegraph markers (warning indicators above enemies)
    for (const t of this.telegraphs) {
      const progress = 1 - t.timer / t.duration;
      const blink = 0.4 + Math.abs(Math.sin(progress * Math.PI * 6)) * 0.6;
      ctx.save();
      ctx.globalAlpha = blink;
      ctx.translate(t.x, 18);
      // Triangle warning pointing down
      ctx.fillStyle = '#ffea00';
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(-7, -6);
      ctx.lineTo(7, -6);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
      // Border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ff8800';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Exclamation
      ctx.fillStyle = '#000';
      ctx.font = 'bold 8px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, -1);
      ctx.restore();
    }

    for (const h of this.hazards) {
      h.render(ctx);
    }
  }

  clear() {
    this.hazards = [];
    this.telegraphs = [];
    this.spawnTimer = 0;
  }
}
