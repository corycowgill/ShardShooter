// Projectile management
import { CONFIG } from './config.js';

export class Projectile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = CONFIG.BULLET_WIDTH;
    this.height = CONFIG.BULLET_HEIGHT;
    this.speed = CONFIG.BULLET_SPEED;
    this.alive = true;
    this.age = 0;
  }

  update() {
    this.y -= this.speed;
    this.age++;
    if (this.y + this.height < 0) {
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

  add(x, y) {
    this.bullets.push(new Projectile(x, y));
  }

  update() {
    for (const b of this.bullets) {
      b.update();
    }
    this.bullets = this.bullets.filter(b => b.alive);
  }

  render(ctx) {
    for (const b of this.bullets) {
      const cx = b.x + b.width / 2;
      ctx.save();

      // Outer glow trail
      const trailGrad = ctx.createLinearGradient(cx, b.y - 2, cx, b.y + b.height + 8);
      trailGrad.addColorStop(0, CONFIG.COLORS.BULLET);
      trailGrad.addColorStop(0.4, CONFIG.COLORS.BULLET_GLOW);
      trailGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = trailGrad;
      ctx.beginPath();
      ctx.moveTo(cx - b.width * 0.8, b.y + b.height + 8);
      ctx.lineTo(cx - b.width / 2, b.y + b.height * 0.3);
      ctx.quadraticCurveTo(cx, b.y - 3, cx + b.width / 2, b.y + b.height * 0.3);
      ctx.lineTo(cx + b.width * 0.8, b.y + b.height + 8);
      ctx.closePath();
      ctx.fill();

      // Bright core
      ctx.shadowColor = CONFIG.COLORS.BULLET;
      ctx.shadowBlur = 8;
      ctx.fillStyle = CONFIG.COLORS.BULLET;
      ctx.beginPath();
      ctx.moveTo(cx - b.width / 2, b.y + b.height);
      ctx.lineTo(cx - b.width / 2, b.y + b.height * 0.3);
      ctx.quadraticCurveTo(cx, b.y - 2, cx + b.width / 2, b.y + b.height * 0.3);
      ctx.lineTo(cx + b.width / 2, b.y + b.height);
      ctx.closePath();
      ctx.fill();

      // White hot tip
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(cx, b.y + 1, 1.2, 0, Math.PI * 2);
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
