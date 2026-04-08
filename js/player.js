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
  }

  reset() {
    this.x = CONFIG.GAME_WIDTH / 2 - this.width / 2;
    this.y = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_Y_OFFSET;
    this.lives = CONFIG.PLAYER_LIVES;
    this.invincibleTimer = 0;
    this.lastFireTime = 0;
    this.alive = true;
  }

  update(input, dt) {
    if (!this.alive) return;

    const moveX = input.getMoveX();
    const touchX = input.getTouchTargetX();

    if (touchX !== null) {
      // Touch: move toward touch X position
      const targetX = touchX - this.width / 2;
      const diff = targetX - this.x;
      if (Math.abs(diff) > CONFIG.TOUCH_DEAD_ZONE) {
        this.x += Math.sign(diff) * Math.min(Math.abs(diff), CONFIG.PLAYER_SPEED * 1.2);
      }
    } else if (moveX !== 0) {
      this.x += moveX * CONFIG.PLAYER_SPEED;
    }

    // Clamp to bounds
    this.x = Math.max(4, Math.min(CONFIG.GAME_WIDTH - this.width - 4, this.x));

    // Update invincibility
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }

    this.thrusterPhase += 0.15;
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
    // Slightly smaller hitbox for fair gameplay
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

    // Shield glow when invincible
    if (this.isInvincible) {
      ctx.beginPath();
      ctx.arc(cx, cy, this.width * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = CONFIG.COLORS.PLAYER_SHIELD;
      ctx.fill();
    }

    // Thruster glow
    const thrusterSize = 4 + Math.sin(this.thrusterPhase) * 2;
    ctx.shadowColor = CONFIG.COLORS.BULLET;
    ctx.shadowBlur = 8;
    ctx.fillStyle = CONFIG.COLORS.BULLET;
    ctx.beginPath();
    ctx.ellipse(cx, this.y + this.height + 2, 3, thrusterSize, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ship body - angular design
    ctx.fillStyle = CONFIG.COLORS.PLAYER;
    ctx.shadowColor = CONFIG.COLORS.PLAYER;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    // Nose
    ctx.moveTo(cx, this.y - 2);
    // Right wing
    ctx.lineTo(cx + this.width / 2, this.y + this.height * 0.7);
    ctx.lineTo(cx + this.width / 2 - 2, this.y + this.height);
    // Bottom center
    ctx.lineTo(cx + 3, this.y + this.height * 0.8);
    ctx.lineTo(cx, this.y + this.height * 0.65);
    ctx.lineTo(cx - 3, this.y + this.height * 0.8);
    // Left wing
    ctx.lineTo(cx - this.width / 2 + 2, this.y + this.height);
    ctx.lineTo(cx - this.width / 2, this.y + this.height * 0.7);
    ctx.closePath();
    ctx.fill();

    // Cockpit accent
    ctx.shadowBlur = 0;
    ctx.fillStyle = CONFIG.COLORS.PLAYER_ACCENT;
    ctx.beginPath();
    ctx.moveTo(cx, this.y + 4);
    ctx.lineTo(cx + 4, this.y + this.height * 0.5);
    ctx.lineTo(cx, this.y + this.height * 0.55);
    ctx.lineTo(cx - 4, this.y + this.height * 0.5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}
