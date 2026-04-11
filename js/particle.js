// Particle system for visual effects
import { CONFIG } from './config.js';

class Particle {
  constructor(x, y, vx, vy, color, life, size, type = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.type = type; // 'circle', 'spark', 'shard', 'ring', 'ember'
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.02;
    this.vx *= 0.99;
    this.life--;
    this.rotation += this.rotSpeed;
    return this.life > 0;
  }

  get alpha() {
    return Math.max(0, this.life / this.maxLife);
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  update() {
    this.particles = this.particles.filter(p => p.update());
    if (this.particles.length > CONFIG.PARTICLE_MAX) {
      this.particles = this.particles.slice(-CONFIG.PARTICLE_MAX);
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'spark') {
        // Bright motion line
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (p.type === 'shard') {
        // Tumbling crystal fragment
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.5, -p.size * 0.2);
        ctx.lineTo(p.size * 0.3, p.size);
        ctx.lineTo(-p.size * 0.4, p.size * 0.6);
        ctx.lineTo(-p.size * 0.6, -p.size * 0.3);
        ctx.closePath();
        ctx.fill();
        // Facet highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * p.alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.3, -p.size * 0.1);
        ctx.lineTo(-p.size * 0.2, -p.size * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'ring') {
        // Expanding ring
        const radius = p.size * (1 - p.alpha) * 3 + p.size;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.3, p.alpha * 2);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (p.type === 'ember') {
        // Floating ember with glow
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Standard circle with glow
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 2.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  explode(x, y, color, count = CONFIG.PARTICLE_EXPLOSION_COUNT) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 1 + Math.random() * 2.5;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        20 + Math.random() * 20,
        1.5 + Math.random() * 2,
        'circle'
      ));
    }
  }

  shardBreak(x, y, color) {
    // Crystal fragments
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        25 + Math.random() * 20,
        2 + Math.random() * 3,
        'shard'
      ));
    }
    // Bright sparks
    for (let i = 0; i < CONFIG.PARTICLE_SPARK_COUNT + 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 3;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        '#ffffff',
        8 + Math.random() * 10,
        1.2,
        'spark'
      ));
    }
    // Expanding shockwave ring
    this.particles.push(new Particle(
      x, y, 0, 0,
      color,
      15,
      4,
      'ring'
    ));
    // Embers
    for (let i = 0; i < 3; i++) {
      this.particles.push(new Particle(
        x + (Math.random() - 0.5) * 8,
        y + (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 0.5,
        -0.5 - Math.random() * 1,
        color,
        30 + Math.random() * 20,
        1 + Math.random(),
        'ember'
      ));
    }
  }

  trail(x, y, color) {
    this.particles.push(new Particle(
      x + (Math.random() - 0.5) * 2, y,
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.5,
      color,
      8 + Math.random() * 5,
      1 + Math.random(),
      'circle'
    ));
  }

  playerHitEffect(x, y) {
    // Big flash ring
    this.particles.push(new Particle(
      x, y, 0, 0, CONFIG.COLORS.PLAYER, 20, 8, 'ring'
    ));
    // Colored explosion
    this.explode(x, y, CONFIG.COLORS.PLAYER, 18);
    // White sparks
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        '#ffffff',
        10 + Math.random() * 8,
        1,
        'spark'
      ));
    }
    // Embers
    for (let i = 0; i < 5; i++) {
      this.particles.push(new Particle(
        x + (Math.random() - 0.5) * 15,
        y + (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 0.8,
        -0.5 - Math.random() * 1.5,
        CONFIG.COLORS.PLAYER,
        35 + Math.random() * 20,
        1.5 + Math.random(),
        'ember'
      ));
    }
  }

  scorePopup(x, y) {
    for (let i = 0; i < 4; i++) {
      this.particles.push(new Particle(
        x + (Math.random() - 0.5) * 10, y,
        (Math.random() - 0.5) * 0.5,
        -1.2 - Math.random(),
        CONFIG.COLORS.UI_SCORE,
        20 + Math.random() * 10,
        1.5,
        'ember'
      ));
    }
  }

  clear() {
    this.particles = [];
  }
}
