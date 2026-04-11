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
    this.type = type; // 'circle', 'spark', 'shard', 'ring', 'ember', 'streak', 'confetti'
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
    this.gravity = 0.02;
    this.drag = 0.99;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= this.drag;
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
        // Bright motion line with gradient
        const tailX = p.x - p.vx * 5;
        const tailY = p.y - p.vy * 5;
        const grad = ctx.createLinearGradient(p.x, p.y, tailX, tailY);
        grad.addColorStop(0, p.color);
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad;
        ctx.lineWidth = p.size;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        // Bright head dot
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'streak') {
        // Long motion blur streak
        const tailLen = 8;
        const tailX = p.x - p.vx * tailLen;
        const tailY = p.y - p.vy * tailLen;
        const grad = ctx.createLinearGradient(p.x, p.y, tailX, tailY);
        grad.addColorStop(0, p.color);
        grad.addColorStop(0.3, p.color + 'aa');
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad;
        ctx.lineWidth = p.size * 1.5;
        ctx.lineCap = 'round';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (p.type === 'confetti') {
        // Tumbling confetti flake
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const scaleY = Math.abs(Math.sin(p.rotation * 2));
        ctx.scale(1, 0.3 + scaleY * 0.7);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
        // Highlight half
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-p.size, -p.size * 0.4, p.size, p.size * 0.8);
      } else if (p.type === 'shard') {
        // Tumbling crystal fragment — enhanced with gradient fill
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        // Gradient body
        const sg = ctx.createLinearGradient(-p.size, -p.size, p.size, p.size);
        sg.addColorStop(0, p.color);
        sg.addColorStop(1, '#ffffff44');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, -p.size * 0.15);
        ctx.lineTo(p.size * 0.35, p.size);
        ctx.lineTo(-p.size * 0.45, p.size * 0.65);
        ctx.lineTo(-p.size * 0.65, -p.size * 0.25);
        ctx.closePath();
        ctx.fill();
        // Edge stroke
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.4;
        ctx.stroke();
        // Facet highlight
        ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * p.alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.35, -p.size * 0.05);
        ctx.lineTo(-p.size * 0.25, -p.size * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.type === 'ring') {
        // Expanding ring — double-band
        const radius = p.size * (1 - p.alpha) * 3 + p.size;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(0.5, p.alpha * 2.5);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        // Inner faint ring
        ctx.globalAlpha = p.alpha * 0.3;
        ctx.lineWidth = Math.max(0.3, p.alpha * 1);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (p.type === 'ember') {
        // Floating ember with glow and inner brightness
        const es = p.size * p.alpha * 0.7;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, es, 0, Math.PI * 2);
        ctx.fill();
        // White core
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.4})`;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, es * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Standard circle with glow
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 3;
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
    // Crystal fragments — more, varied sizes
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        25 + Math.random() * 25,
        2 + Math.random() * 4,
        'shard'
      ));
    }
    // Bright sparks — more with varied speeds
    for (let i = 0; i < CONFIG.PARTICLE_SPARK_COUNT + 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4;
      this.particles.push(new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        '#ffffff',
        8 + Math.random() * 12,
        0.8 + Math.random() * 0.8,
        'spark'
      ));
    }
    // Colored streaks — fast radial burst
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 2;
      const p = new Particle(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        color,
        12 + Math.random() * 8,
        1.2,
        'streak'
      );
      p.gravity = 0;
      p.drag = 0.96;
      this.particles.push(p);
    }
    // Expanding shockwave ring
    this.particles.push(new Particle(
      x, y, 0, 0,
      color,
      18,
      5,
      'ring'
    ));
    // Embers — more, lingering longer
    for (let i = 0; i < 5; i++) {
      const p = new Particle(
        x + (Math.random() - 0.5) * 10,
        y + (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 0.6,
        -0.5 - Math.random() * 1.2,
        color,
        35 + Math.random() * 25,
        1 + Math.random() * 1.5,
        'ember'
      );
      p.gravity = -0.005; // float upward
      this.particles.push(p);
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
      const p = new Particle(
        x + (Math.random() - 0.5) * 10, y,
        (Math.random() - 0.5) * 0.5,
        -1.2 - Math.random(),
        CONFIG.COLORS.UI_SCORE,
        20 + Math.random() * 10,
        1.5,
        'ember'
      );
      p.gravity = -0.01;
      this.particles.push(p);
    }
  }

  // Wave clear celebration — confetti + ring burst
  waveClear() {
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const colors = ['#ff4081', '#00e5ff', '#ffe033', '#e040fb', '#00e676', '#7c4dff'];

    // Confetti rain from top
    for (let i = 0; i < 35; i++) {
      const p = new Particle(
        Math.random() * W,
        -10 - Math.random() * 40,
        (Math.random() - 0.5) * 2,
        1.5 + Math.random() * 2,
        colors[Math.floor(Math.random() * colors.length)],
        50 + Math.random() * 40,
        2 + Math.random() * 3,
        'confetti'
      );
      p.gravity = 0.04;
      p.drag = 0.995;
      p.rotSpeed = (Math.random() - 0.5) * 0.3;
      this.particles.push(p);
    }

    // Central ring burst
    this.particles.push(new Particle(
      W / 2, H / 2, 0, 0,
      '#00e5ff',
      25, 12, 'ring'
    ));

    // Radial streak burst from center
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 3 + Math.random() * 2;
      const p = new Particle(
        W / 2, H / 2,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        colors[i % colors.length],
        18 + Math.random() * 10,
        1.5,
        'streak'
      );
      p.gravity = 0;
      p.drag = 0.95;
      this.particles.push(p);
    }
  }

  clear() {
    this.particles = [];
  }
}
