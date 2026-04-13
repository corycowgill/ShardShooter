// Projectile management
import { CONFIG } from './config.js';

export class Projectile {
  constructor(x, y, angle = 0, pierces = 0) {
    this.x = x;
    this.y = y;
    this.width = CONFIG.BULLET_WIDTH;
    this.height = CONFIG.BULLET_HEIGHT;
    this.speed = CONFIG.BULLET_SPEED;
    this.vx = Math.sin(angle) * this.speed;
    this.vy = -Math.cos(angle) * this.speed;
    this.alive = true;
    this.age = 0;
    this.pierces = pierces; // how many additional shards this bullet can pass through
    this.hitThisFrame = new Set(); // prevent double-hit on same segment
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.age++;
    if (this.y + this.height < 0 || this.x < -10 || this.x > CONFIG.GAME_WIDTH + 10) {
      this.alive = false;
    }
  }

  get centerX() {
    return this.x + this.width / 2;
  }

  get centerY() {
    return this.y + this.height / 2;
  }
}

export class ProjectileManager {
  constructor() {
    this.bullets = [];
  }

  add(x, y, pierces = 0) {
    this.bullets.push(new Projectile(x, y, 0, pierces));
  }

  addAngled(x, y, angle, pierces = 0) {
    this.bullets.push(new Projectile(x, y, angle, pierces));
  }

  update() {
    for (const b of this.bullets) {
      b.update();
      if (b.hitThisFrame) b.hitThisFrame.clear();
    }
    this.bullets = this.bullets.filter(b => b.alive);
  }

  render(ctx) {
    for (const b of this.bullets) {
      const bcx = b.x + b.width / 2;
      const bcy = b.y + b.height / 2;
      const isPierce = b.pierces > 0;
      const bodyColor = isPierce ? '#99ffcc' : CONFIG.COLORS.BULLET;
      const glowColor = isPierce ? '#00ff88' : CONFIG.COLORS.BULLET_GLOW;
      ctx.save();

      // Rotate to match travel direction
      const angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      ctx.translate(bcx, bcy);
      ctx.rotate(angle);
      // Now draw in local coords: nose at -h/2, tail at +h/2
      const hw = b.width / 2;
      const hh = b.height / 2;

      // Comet tail glow (long, fading)
      const tailLen = 12 + b.age * 0.15;
      const tailGrad = ctx.createLinearGradient(0, -hh, 0, hh + tailLen);
      tailGrad.addColorStop(0, bodyColor);
      tailGrad.addColorStop(0.2, glowColor);
      tailGrad.addColorStop(0.6, glowColor + '44');
      tailGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.moveTo(-hw * 1.2, hh + tailLen);
      ctx.lineTo(-hw, hh * 0.3);
      ctx.quadraticCurveTo(0, -hh - 3, hw, hh * 0.3);
      ctx.lineTo(hw * 1.2, hh + tailLen);
      ctx.closePath();
      ctx.fill();

      // Outer energy halo
      const haloGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, hw * 4);
      haloGrad.addColorStop(0, bodyColor + '33');
      haloGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, 0, hw * 4, 0, Math.PI * 2);
      ctx.fill();

      // Bright core body
      ctx.shadowColor = bodyColor;
      ctx.shadowBlur = isPierce ? 14 : 10;
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.moveTo(-hw, hh);
      ctx.lineTo(-hw, hh * 0.3);
      ctx.quadraticCurveTo(0, -hh - 2, hw, hh * 0.3);
      ctx.lineTo(hw, hh);
      ctx.closePath();
      ctx.fill();

      // White hot tip
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(0, -hh + 1, 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Inner white streak
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.3, hh * 0.5);
      ctx.quadraticCurveTo(0, -hh, hw * 0.3, hh * 0.5);
      ctx.lineTo(hw * 0.15, hh);
      ctx.lineTo(-hw * 0.15, hh);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  clear() {
    this.bullets = [];
  }

  remove(bullet) {
    bullet.alive = false;
  }
}
