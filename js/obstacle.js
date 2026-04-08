// Static crystal obstacle entities
import { CONFIG } from './config.js';

export class Obstacle {
  constructor(x, y, variant = 0) {
    this.x = x;
    this.y = y;
    this.size = CONFIG.OBSTACLE_SIZE;
    this.variant = variant; // visual variant
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  get hitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.size,
      height: this.size,
    };
  }

  get centerX() {
    return this.x + this.size / 2;
  }

  get centerY() {
    return this.y + this.size / 2;
  }

  update() {
    this.pulsePhase += 0.02;
  }

  render(ctx) {
    const cx = this.centerX;
    const cy = this.centerY;
    const s = this.size / 2;
    const pulse = 0.8 + Math.sin(this.pulsePhase) * 0.2;

    ctx.save();
    ctx.shadowColor = CONFIG.COLORS.OBSTACLE;
    ctx.shadowBlur = 6 * pulse;

    // Crystal cluster shape
    ctx.fillStyle = CONFIG.COLORS.OBSTACLE;

    if (this.variant === 0) {
      // Diamond crystal
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s * 0.8, cy);
      ctx.lineTo(cx, cy + s);
      ctx.lineTo(cx - s * 0.8, cy);
      ctx.closePath();
      ctx.fill();

      // Inner facet
      ctx.fillStyle = CONFIG.COLORS.OBSTACLE_ACCENT;
      ctx.beginPath();
      ctx.moveTo(cx, cy - s * 0.5);
      ctx.lineTo(cx + s * 0.4, cy);
      ctx.lineTo(cx, cy + s * 0.5);
      ctx.lineTo(cx - s * 0.4, cy);
      ctx.closePath();
      ctx.fill();
    } else if (this.variant === 1) {
      // Pillar
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.4, cy + s);
      ctx.lineTo(cx - s * 0.5, cy - s * 0.3);
      ctx.lineTo(cx - s * 0.1, cy - s);
      ctx.lineTo(cx + s * 0.2, cy - s * 0.8);
      ctx.lineTo(cx + s * 0.5, cy - s * 0.2);
      ctx.lineTo(cx + s * 0.4, cy + s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = CONFIG.COLORS.OBSTACLE_ACCENT;
      ctx.fillRect(cx - s * 0.15, cy - s * 0.6, s * 0.3, s * 0.4);
    } else {
      // Cluster of small crystals
      const offsets = [
        { dx: 0, dy: -s * 0.4, sc: 0.5 },
        { dx: -s * 0.4, dy: s * 0.2, sc: 0.4 },
        { dx: s * 0.3, dy: s * 0.1, sc: 0.45 },
      ];
      for (const off of offsets) {
        ctx.beginPath();
        ctx.moveTo(cx + off.dx, cy + off.dy - s * off.sc);
        ctx.lineTo(cx + off.dx + s * off.sc * 0.6, cy + off.dy + s * off.sc * 0.5);
        ctx.lineTo(cx + off.dx - s * off.sc * 0.6, cy + off.dy + s * off.sc * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

export class ObstacleManager {
  constructor() {
    this.obstacles = [];
  }

  generate(wave) {
    this.obstacles = [];
    const count = Math.min(
      CONFIG.OBSTACLE_MAX_PER_WAVE,
      Math.floor(wave / 2)
    );

    const gridCols = Math.floor(CONFIG.GAME_WIDTH / CONFIG.OBSTACLE_SIZE);
    const usedCells = new Set();

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 20) {
        const col = 1 + Math.floor(Math.random() * (gridCols - 2));
        const y = CONFIG.OBSTACLE_MIN_Y +
                  Math.floor(Math.random() *
                  ((CONFIG.OBSTACLE_MAX_Y - CONFIG.OBSTACLE_MIN_Y) / CONFIG.OBSTACLE_SIZE)) *
                  CONFIG.OBSTACLE_SIZE;
        const key = `${col},${y}`;

        if (!usedCells.has(key)) {
          usedCells.add(key);
          this.obstacles.push(new Obstacle(
            col * CONFIG.OBSTACLE_SIZE,
            y,
            Math.floor(Math.random() * 3)
          ));
          break;
        }
        attempts++;
      }
    }
  }

  update() {
    for (const obs of this.obstacles) {
      obs.update();
    }
  }

  render(ctx) {
    for (const obs of this.obstacles) {
      obs.render(ctx);
    }
  }

  clear() {
    this.obstacles = [];
  }
}
