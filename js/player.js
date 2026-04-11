// Player entity
import { CONFIG } from './config.js';

export class Player {
  constructor() {
    this.width = CONFIG.PLAYER_WIDTH;
    this.height = CONFIG.PLAYER_HEIGHT;
    this.x = CONFIG.GAME_WIDTH / 2 - this.width / 2;
    this.y = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_Y_OFFSET;
    this.lives = CONFIG.PLAYER_LIVES;
    this.invincibleTimer = 0;
    this.lastFireTime = 0;
    this.alive = true;
    this.thrusterPhase = 0;
    this.tilt = 0; // visual lean when moving
    this.trail = []; // afterimage position history
  }

  reset() {
    this.x = CONFIG.GAME_WIDTH / 2 - this.width / 2;
    this.y = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_Y_OFFSET;
    this.lives = CONFIG.PLAYER_LIVES;
    this.invincibleTimer = 0;
    this.lastFireTime = 0;
    this.alive = true;
    this.tilt = 0;
    this.trail = [];
  }

  update(input, dt) {
    if (!this.alive) return;

    const moveX = input.getMoveX();
    const touchX = input.getTouchTargetX();

    let moveDir = 0;
    if (touchX !== null) {
      const targetX = touchX - this.width / 2;
      const diff = targetX - this.x;
      if (Math.abs(diff) > CONFIG.TOUCH_DEAD_ZONE) {
        const step = Math.sign(diff) * Math.min(Math.abs(diff), CONFIG.PLAYER_SPEED * 1.2);
        this.x += step;
        moveDir = Math.sign(step);
      }
    } else if (moveX !== 0) {
      this.x += moveX * CONFIG.PLAYER_SPEED;
      moveDir = Math.sign(moveX);
    }

    // Smooth tilt toward movement direction
    const targetTilt = moveDir * 0.25;
    this.tilt += (targetTilt - this.tilt) * 0.15;

    this.x = Math.max(4, Math.min(CONFIG.GAME_WIDTH - this.width - 4, this.x));

    // Store afterimage trail when moving
    if (Math.abs(moveDir) > 0) {
      this.trail.push({ x: this.x, y: this.y, tilt: this.tilt });
      if (this.trail.length > 5) this.trail.shift();
    } else if (this.trail.length > 0) {
      this.trail.shift();
    }

    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }

    this.thrusterPhase += 0.18;
  }

  hit() {
    if (this.invincibleTimer > 0) return false;
    this.lives--;
    if (this.lives <= 0) {
      this.alive = false;
    }
    this.invincibleTimer = CONFIG.PLAYER_INVINCIBLE_TIME;
    return true;
  }

  canFire(now) {
    return this.alive && now - this.lastFireTime >= CONFIG.FIRE_RATE;
  }

  fire(now) {
    this.lastFireTime = now;
    return {
      x: this.x + this.width / 2 - CONFIG.BULLET_WIDTH / 2,
      y: this.y - CONFIG.BULLET_HEIGHT,
    };
  }

  get isInvincible() {
    return this.invincibleTimer > 0;
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }

  get hitbox() {
    const inset = 3;
    return {
      x: this.x + inset,
      y: this.y + inset,
      width: this.width - inset * 2,
      height: this.height - inset * 2,
    };
  }

  render(ctx, shieldPowerUp = false) {
    if (!this.alive) return;

    // Blink when invincible
    if (this.isInvincible && Math.floor(this.invincibleTimer / 80) % 2 === 0) {
      return;
    }

    ctx.save();
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    // Apply tilt
    ctx.translate(cx, cy);
    ctx.rotate(this.tilt);
    ctx.translate(-cx, -cy);

    // --- Afterimage ghost trail ---
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const ga = (i + 1) / (this.trail.length + 1) * 0.15;
      const tcx = t.x + this.width / 2;
      ctx.save();
      ctx.globalAlpha = ga;
      ctx.translate(tcx, cy);
      ctx.rotate(t.tilt);
      ctx.translate(-tcx, -cy);
      ctx.fillStyle = CONFIG.COLORS.PLAYER;
      ctx.beginPath();
      ctx.moveTo(tcx, t.y - 3);
      ctx.lineTo(tcx + this.width / 2, t.y + this.height * 0.7);
      ctx.lineTo(tcx - this.width / 2, t.y + this.height * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // --- Energy wing trails (ghostly streaks behind wings when moving) ---
    if (Math.abs(this.tilt) > 0.03) {
      const trailAlpha = Math.min(0.35, Math.abs(this.tilt) * 1.5);
      const trailDir = -Math.sign(this.tilt);
      for (let t = 1; t <= 3; t++) {
        const ta = trailAlpha * (1 - t * 0.28);
        const ox = trailDir * t * 4;
        ctx.fillStyle = `rgba(0, 229, 255, ${ta * 0.3})`;
        ctx.beginPath();
        ctx.moveTo(cx + ox, this.y + 2);
        ctx.lineTo(cx + this.width / 2 + ox, this.y + this.height * 0.7);
        ctx.lineTo(cx + ox, this.y + this.height * 0.65);
        ctx.lineTo(cx - this.width / 2 + ox, this.y + this.height * 0.7);
        ctx.closePath();
        ctx.fill();
      }
    }

    // --- Shield bubble (power-up or invincible) ---
    if (this.isInvincible || shieldPowerUp) {
      const shieldPulse = 0.5 + Math.sin(this.thrusterPhase * 3) * 0.3;
      const sr = this.width * 0.9;
      const shieldColor = shieldPowerUp ? 'rgba(0, 229, 255,' : 'rgba(0, 180, 255,';

      // Outer glow ring
      ctx.shadowColor = shieldPowerUp ? '#00e5ff' : '#0088cc';
      ctx.shadowBlur = 18 * shieldPulse;

      // Multi-layer hex shield
      for (let ring = 0; ring < 2; ring++) {
        const ringR = sr - ring * 4;
        const ringAlpha = (shieldPulse * (0.5 - ring * 0.2));
        ctx.strokeStyle = `${shieldColor} ${ringAlpha})`;
        ctx.lineWidth = 1.5 - ring * 0.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 2 + this.thrusterPhase * 0.3 * (ring === 0 ? 1 : -1);
          const px = cx + Math.cos(a) * ringR;
          const py = cy + Math.sin(a) * ringR;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Inner glow fill
      const fillGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sr);
      fillGrad.addColorStop(0, `${shieldColor} ${shieldPulse * 0.06})`);
      fillGrad.addColorStop(0.7, `${shieldColor} ${shieldPulse * 0.03})`);
      fillGrad.addColorStop(1, `${shieldColor} ${shieldPulse * 0.12})`);
      ctx.fillStyle = fillGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, sr, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle nodes at hex vertices
      if (shieldPowerUp) {
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i - Math.PI / 2 + this.thrusterPhase * 0.3;
          const nx = cx + Math.cos(a) * sr;
          const ny = cy + Math.sin(a) * sr;
          const nodeAlpha = 0.3 + Math.sin(this.thrusterPhase * 2 + i) * 0.3;
          ctx.fillStyle = `rgba(150, 240, 255, ${nodeAlpha})`;
          ctx.beginPath();
          ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
    }

    // --- Thruster flames (enhanced with color layers) ---
    const t1 = 5 + Math.sin(this.thrusterPhase) * 3;
    const t2 = 4 + Math.sin(this.thrusterPhase + 1) * 2.5;
    const t3 = 3 + Math.sin(this.thrusterPhase + 2) * 2;
    const flickerA = 0.6 + Math.sin(this.thrusterPhase * 2.7) * 0.4;

    // Wide ambient engine glow
    const ambGrad = ctx.createRadialGradient(
      cx, this.y + this.height + 6, 0,
      cx, this.y + this.height + 6, t1 + 10
    );
    ambGrad.addColorStop(0, `rgba(0, 180, 255, ${flickerA * 0.15})`);
    ambGrad.addColorStop(0.4, `rgba(255, 170, 0, ${flickerA * 0.2})`);
    ambGrad.addColorStop(0.7, `rgba(255, 80, 0, ${flickerA * 0.1})`);
    ambGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = ambGrad;
    ctx.beginPath();
    ctx.arc(cx, this.y + this.height + 6, t1 + 10, 0, Math.PI * 2);
    ctx.fill();

    // Outer thruster plumes (orange)
    ctx.shadowColor = '#ff6600';
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(255, 150, 30, ${flickerA * 0.7})`;
    ctx.beginPath();
    ctx.ellipse(cx - 6, this.y + this.height + 2, 2, t2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 6, this.y + this.height + 2, 2, t2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner thruster plumes (yellow)
    ctx.fillStyle = `rgba(255, 220, 80, ${flickerA * 0.8})`;
    ctx.beginPath();
    ctx.ellipse(cx - 5, this.y + this.height + 2, 1.2, t3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 5, this.y + this.height + 2, 1.2, t3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Center thruster (white-hot core)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffe033';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.ellipse(cx, this.y + this.height + 2, 2.5, t1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blue-white center core
    ctx.fillStyle = `rgba(180, 220, 255, ${flickerA})`;
    ctx.shadowColor = '#88ccff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(cx, this.y + this.height + 1, 1.5, t1 * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- Ship body layers ---

    // Wing underside detail / shadow layer
    ctx.fillStyle = '#004466';
    ctx.beginPath();
    ctx.moveTo(cx, this.y + 2);
    ctx.lineTo(cx + this.width / 2 + 1, this.y + this.height * 0.75);
    ctx.lineTo(cx + this.width / 2 - 1, this.y + this.height + 1);
    ctx.lineTo(cx + 3, this.y + this.height * 0.85);
    ctx.lineTo(cx - 3, this.y + this.height * 0.85);
    ctx.lineTo(cx - this.width / 2 + 1, this.y + this.height + 1);
    ctx.lineTo(cx - this.width / 2 - 1, this.y + this.height * 0.75);
    ctx.closePath();
    ctx.fill();

    // Main hull with gradient
    const hullGrad = ctx.createLinearGradient(cx - this.width / 2, this.y, cx + this.width / 2, this.y + this.height);
    hullGrad.addColorStop(0, '#33ddff');
    hullGrad.addColorStop(0.3, CONFIG.COLORS.PLAYER);
    hullGrad.addColorStop(0.7, '#0099bb');
    hullGrad.addColorStop(1, '#006688');
    ctx.fillStyle = hullGrad;
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(cx, this.y - 3);
    ctx.lineTo(cx + this.width / 2, this.y + this.height * 0.7);
    ctx.lineTo(cx + this.width / 2 - 2, this.y + this.height);
    ctx.lineTo(cx + 3, this.y + this.height * 0.8);
    ctx.lineTo(cx, this.y + this.height * 0.65);
    ctx.lineTo(cx - 3, this.y + this.height * 0.8);
    ctx.lineTo(cx - this.width / 2 + 2, this.y + this.height);
    ctx.lineTo(cx - this.width / 2, this.y + this.height * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Hull edge highlight
    ctx.strokeStyle = 'rgba(150, 240, 255, 0.3)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Wing panel lines with glow
    ctx.strokeStyle = 'rgba(0, 200, 240, 0.45)';
    ctx.lineWidth = 0.7;
    ctx.shadowColor = 'rgba(0, 200, 240, 0.3)';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 3, this.y + 6);
    ctx.lineTo(cx - this.width / 2 + 2, this.y + this.height * 0.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 3, this.y + 6);
    ctx.lineTo(cx + this.width / 2 - 2, this.y + this.height * 0.8);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Wing surface detail — subtle rivet lines
    ctx.strokeStyle = 'rgba(0, 150, 200, 0.2)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(cx - 6, this.y + 10);
    ctx.lineTo(cx - this.width / 2 + 4, this.y + this.height * 0.75);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 6, this.y + 10);
    ctx.lineTo(cx + this.width / 2 - 4, this.y + this.height * 0.75);
    ctx.stroke();

    // Central spine highlight
    const spineGrad = ctx.createLinearGradient(cx, this.y, cx, this.y + this.height * 0.7);
    spineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    spineGrad.addColorStop(0.5, 'rgba(200, 240, 255, 0.15)');
    spineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = spineGrad;
    ctx.beginPath();
    ctx.moveTo(cx, this.y - 2);
    ctx.lineTo(cx + 2.5, this.y + this.height * 0.4);
    ctx.lineTo(cx, this.y + this.height * 0.55);
    ctx.lineTo(cx - 2.5, this.y + this.height * 0.4);
    ctx.closePath();
    ctx.fill();

    // Cockpit - glowing canopy with reflection
    const cockpitGrad = ctx.createLinearGradient(cx, this.y + 3, cx, this.y + this.height * 0.5);
    cockpitGrad.addColorStop(0, '#22bbff');
    cockpitGrad.addColorStop(0.3, '#0099dd');
    cockpitGrad.addColorStop(0.6, CONFIG.COLORS.PLAYER_ACCENT);
    cockpitGrad.addColorStop(1, '#002244');
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath();
    ctx.moveTo(cx, this.y + 3);
    ctx.lineTo(cx + 3.5, this.y + this.height * 0.42);
    ctx.lineTo(cx, this.y + this.height * 0.52);
    ctx.lineTo(cx - 3.5, this.y + this.height * 0.42);
    ctx.closePath();
    ctx.fill();

    // Cockpit reflection streak
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(cx - 1.5, this.y + 5);
    ctx.lineTo(cx + 0.5, this.y + 5);
    ctx.lineTo(cx - 0.5, this.y + this.height * 0.35);
    ctx.lineTo(cx - 2, this.y + this.height * 0.35);
    ctx.closePath();
    ctx.fill();

    // Cockpit glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(cx - 1, this.y + 6, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Wing tip lights (alternating blink)
    const wingLightAlpha = 0.5 + Math.sin(this.thrusterPhase * 2) * 0.5;
    const wingLight2 = 0.5 + Math.sin(this.thrusterPhase * 2 + Math.PI) * 0.5;
    ctx.fillStyle = `rgba(255, 50, 80, ${wingLightAlpha})`;
    ctx.shadowColor = '#ff3050';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx - this.width / 2 + 1, this.y + this.height * 0.75, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(50, 255, 120, ${wingLight2})`;
    ctx.shadowColor = '#33ff77';
    ctx.beginPath();
    ctx.arc(cx + this.width / 2 - 1, this.y + this.height * 0.75, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Nose tip glow — pulsing beacon
    const nosePulse = 0.5 + Math.sin(this.thrusterPhase * 1.5) * 0.3;
    ctx.fillStyle = `rgba(0, 229, 255, ${nosePulse + 0.2})`;
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(cx, this.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    // White hot center
    ctx.fillStyle = `rgba(255, 255, 255, ${nosePulse})`;
    ctx.beginPath();
    ctx.arc(cx, this.y - 2, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}
