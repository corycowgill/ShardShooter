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
  }

  reset() {
    this.x = CONFIG.GAME_WIDTH / 2 - this.width / 2;
    this.y = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_Y_OFFSET;
    this.lives = CONFIG.PLAYER_LIVES;
    this.invincibleTimer = 0;
    this.lastFireTime = 0;
    this.alive = true;
    this.tilt = 0;
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

  render(ctx) {
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

    // Shield effect when invincible
    if (this.isInvincible) {
      const shieldPulse = 0.5 + Math.sin(this.thrusterPhase * 3) * 0.3;
      // Hex shield
      ctx.strokeStyle = `rgba(0, 229, 255, ${shieldPulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = CONFIG.COLORS.PLAYER;
      ctx.shadowBlur = 12;
      const sr = this.width * 0.85;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = cx + Math.cos(a) * sr;
        const py = cy + Math.sin(a) * sr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner glow fill
      ctx.fillStyle = `rgba(0, 229, 255, ${shieldPulse * 0.08})`;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // --- Thruster flames ---
    const t1 = 4 + Math.sin(this.thrusterPhase) * 2.5;
    const t2 = 3.5 + Math.sin(this.thrusterPhase + 1) * 2;
    const flickerA = 0.6 + Math.sin(this.thrusterPhase * 2.7) * 0.4;

    // Outer thruster glow (wide, faint)
    const thrustGrad = ctx.createRadialGradient(
      cx, this.y + this.height + 4, 0,
      cx, this.y + this.height + 4, t1 + 6
    );
    thrustGrad.addColorStop(0, `rgba(255, 170, 0, ${flickerA * 0.4})`);
    thrustGrad.addColorStop(0.5, `rgba(255, 100, 0, ${flickerA * 0.2})`);
    thrustGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = thrustGrad;
    ctx.beginPath();
    ctx.arc(cx, this.y + this.height + 4, t1 + 6, 0, Math.PI * 2);
    ctx.fill();

    // Left thruster
    ctx.fillStyle = '#ffcc44';
    ctx.shadowColor = '#ff8800';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(cx - 5, this.y + this.height + 2, 1.8, t2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Right thruster
    ctx.beginPath();
    ctx.ellipse(cx + 5, this.y + this.height + 2, 1.8, t2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Center thruster (brighter, larger)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffe033';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(cx, this.y + this.height + 2, 2.2, t1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- Ship body layers ---

    // Wing underside detail / shadow layer
    ctx.fillStyle = '#005577';
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

    // Main hull
    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 12;
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

    // Wing panel lines
    ctx.strokeStyle = 'rgba(0, 180, 220, 0.5)';
    ctx.lineWidth = 0.7;
    // Left wing line
    ctx.beginPath();
    ctx.moveTo(cx - 3, this.y + 6);
    ctx.lineTo(cx - this.width / 2 + 2, this.y + this.height * 0.8);
    ctx.stroke();
    // Right wing line
    ctx.beginPath();
    ctx.moveTo(cx + 3, this.y + 6);
    ctx.lineTo(cx + this.width / 2 - 2, this.y + this.height * 0.8);
    ctx.stroke();

    // Central spine highlight
    const spineGrad = ctx.createLinearGradient(cx, this.y, cx, this.y + this.height * 0.7);
    spineGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    spineGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = spineGrad;
    ctx.beginPath();
    ctx.moveTo(cx, this.y - 2);
    ctx.lineTo(cx + 2, this.y + this.height * 0.4);
    ctx.lineTo(cx, this.y + this.height * 0.55);
    ctx.lineTo(cx - 2, this.y + this.height * 0.4);
    ctx.closePath();
    ctx.fill();

    // Cockpit - glowing canopy
    const cockpitGrad = ctx.createLinearGradient(cx, this.y + 3, cx, this.y + this.height * 0.5);
    cockpitGrad.addColorStop(0, '#0099dd');
    cockpitGrad.addColorStop(0.5, CONFIG.COLORS.PLAYER_ACCENT);
    cockpitGrad.addColorStop(1, '#003355');
    ctx.fillStyle = cockpitGrad;
    ctx.beginPath();
    ctx.moveTo(cx, this.y + 3);
    ctx.lineTo(cx + 3.5, this.y + this.height * 0.42);
    ctx.lineTo(cx, this.y + this.height * 0.52);
    ctx.lineTo(cx - 3.5, this.y + this.height * 0.42);
    ctx.closePath();
    ctx.fill();

    // Cockpit glint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(cx - 1, this.y + 7, 1, 0, Math.PI * 2);
    ctx.fill();

    // Wing tip lights
    const wingLightAlpha = 0.5 + Math.sin(this.thrusterPhase * 2) * 0.5;
    ctx.fillStyle = `rgba(255, 50, 80, ${wingLightAlpha})`;
    ctx.shadowColor = '#ff3050';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(cx - this.width / 2 + 1, this.y + this.height * 0.75, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + this.width / 2 - 1, this.y + this.height * 0.75, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Nose tip glow
    ctx.fillStyle = 'rgba(0, 229, 255, 0.7)';
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(cx, this.y - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }
}
