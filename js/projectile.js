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
  }

  update() {
    this.y -= this.speed;
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
      ctx.save();
      ctx.fillStyle = CONFIG.COLORS.BULLET;
      ctx.shadowColor = CONFIG.COLORS.BULLET_GLOW;
      ctx.shadowBlur = 6;

      // Bullet shape: small elongated rectangle with rounded top
      const cx = b.x + b.width / 2;
      ctx.beginPath();
      ctx.moveTo(cx - b.width / 2, b.y + b.height);
      ctx.lineTo(cx - b.width / 2, b.y + b.height * 0.3);
      ctx.quadraticCurveTo(cx, b.y - 2, cx + b.width / 2, b.y + b.height * 0.3);
      ctx.lineTo(cx + b.width / 2, b.y + b.height);
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
