// Static crystal obstacle entities
import { CONFIG } from './config.js';

export class Obstacle {
  constructor(x, y, variant = 0) {
    this.x = x;
    this.y = y;
    this.size = CONFIG.OBSTACLE_SIZE;
    this.variant = variant;
    this.pulsePhase = Math.random() * Math.PI * 2;
    // Random sub-crystal angles for the cluster variant
    this.crystals = [];
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
      this.crystals.push({
        angle: Math.random() * Math.PI * 2,
        len: 0.3 + Math.random() * 0.5,
        width: 0.15 + Math.random() * 0.2,
        offset: (Math.random() - 0.5) * 0.4,
      });
    }
  }

  get hitbox() {
    return { x: this.x, y: this.y, width: this.size, height: this.size };
  }

  get centerX() { return this.x + this.size / 2; }
  get centerY() { return this.y + this.size / 2; }

  update() {
    this.pulsePhase += 0.02;
  }

  render(ctx) {
    const cx = this.centerX;
    const cy = this.centerY;
    const s = this.size / 2;
    const pulse = 0.8 + Math.sin(this.pulsePhase) * 0.2;

    ctx.save();

    // Larger, richer base glow
    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 2);
    glowGrad.addColorStop(0, `rgba(0, 230, 118, ${0.1 * pulse})`);
    glowGrad.addColorStop(0.5, `rgba(0, 180, 90, ${0.04 * pulse})`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = CONFIG.COLORS.OBSTACLE;
    ctx.shadowBlur = 8 * pulse;

    if (this.variant === 0) {
      this._renderDiamond(ctx, cx, cy, s, pulse);
    } else if (this.variant === 1) {
      this._renderPillar(ctx, cx, cy, s, pulse);
    } else {
      this._renderCluster(ctx, cx, cy, s, pulse);
    }

    // Floating energy rune — small orbiting glyph
    ctx.shadowBlur = 0;
    const runeAngle = this.pulsePhase * 0.5;
    const runeR = s * 1.2;
    const rx = cx + Math.cos(runeAngle) * runeR;
    const ry = cy + Math.sin(runeAngle) * runeR;
    ctx.fillStyle = `rgba(0, 230, 118, ${0.2 + pulse * 0.15})`;
    ctx.font = '7px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const runes = ['\u25C6', '\u25B2', '\u2666', '\u2756'];
    ctx.fillText(runes[this.variant % runes.length], rx, ry);

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _renderDiamond(ctx, cx, cy, s, pulse) {
    // Outer diamond
    const outerGrad = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
    outerGrad.addColorStop(0, '#00ff88');
    outerGrad.addColorStop(0.5, CONFIG.COLORS.OBSTACLE);
    outerGrad.addColorStop(1, CONFIG.COLORS.OBSTACLE_ACCENT);
    ctx.fillStyle = outerGrad;

    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.8, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s * 0.8, cy);
    ctx.closePath();
    ctx.fill();

    // Edge highlight
    ctx.strokeStyle = 'rgba(200, 255, 230, 0.4)';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // Left facet (lighter)
    ctx.fillStyle = 'rgba(200, 255, 230, 0.2)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx - s * 0.8, cy);
    ctx.lineTo(cx, cy + 1);
    ctx.closePath();
    ctx.fill();

    // Right facet (darker)
    ctx.fillStyle = 'rgba(0, 50, 30, 0.25)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.8, cy);
    ctx.lineTo(cx, cy + 1);
    ctx.closePath();
    ctx.fill();

    // Inner gem
    ctx.shadowBlur = 0;
    const innerGrad = ctx.createRadialGradient(cx - s * 0.15, cy - s * 0.15, 0, cx, cy, s * 0.45);
    innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    innerGrad.addColorStop(0.5, CONFIG.COLORS.OBSTACLE_ACCENT);
    innerGrad.addColorStop(1, 'rgba(0, 80, 50, 0.6)');
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.45);
    ctx.lineTo(cx + s * 0.35, cy);
    ctx.lineTo(cx, cy + s * 0.45);
    ctx.lineTo(cx - s * 0.35, cy);
    ctx.closePath();
    ctx.fill();

    // Specular dot
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(cx - s * 0.12, cy - s * 0.2, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Shimmer sweep — animated highlight band
    const shimmerPos = ((this.pulsePhase * 0.3) % (Math.PI * 2)) / (Math.PI * 2);
    const shimmerY = cy - s + shimmerPos * s * 2;
    ctx.globalAlpha = 0.08 + pulse * 0.05;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, shimmerY, s * 0.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  _renderPillar(ctx, cx, cy, s, pulse) {
    // Tall crystal pillar with facets
    const baseW = s * 0.6;
    const topW = s * 0.25;

    // Left face (dark)
    ctx.fillStyle = CONFIG.COLORS.OBSTACLE_ACCENT;
    ctx.beginPath();
    ctx.moveTo(cx - baseW, cy + s);
    ctx.lineTo(cx - topW, cy - s * 0.9);
    ctx.lineTo(cx, cy - s);
    ctx.lineTo(cx, cy + s * 0.3);
    ctx.closePath();
    ctx.fill();

    // Right face (medium)
    ctx.fillStyle = CONFIG.COLORS.OBSTACLE;
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.3);
    ctx.lineTo(cx, cy - s);
    ctx.lineTo(cx + topW * 0.8, cy - s * 0.85);
    ctx.lineTo(cx + baseW * 0.8, cy + s);
    ctx.closePath();
    ctx.fill();

    // Front face (bright)
    const frontGrad = ctx.createLinearGradient(cx - baseW, cy, cx + baseW, cy);
    frontGrad.addColorStop(0, CONFIG.COLORS.OBSTACLE_ACCENT);
    frontGrad.addColorStop(0.4, '#00ff88');
    frontGrad.addColorStop(1, CONFIG.COLORS.OBSTACLE);
    ctx.fillStyle = frontGrad;
    ctx.beginPath();
    ctx.moveTo(cx - baseW, cy + s);
    ctx.lineTo(cx - topW, cy - s * 0.9);
    ctx.lineTo(cx + topW * 0.8, cy - s * 0.85);
    ctx.lineTo(cx + baseW * 0.8, cy + s);
    ctx.closePath();
    ctx.fill();

    // Edge lines
    ctx.strokeStyle = 'rgba(200, 255, 230, 0.35)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - topW, cy - s * 0.9);
    ctx.lineTo(cx - baseW, cy + s);
    ctx.moveTo(cx + topW * 0.8, cy - s * 0.85);
    ctx.lineTo(cx + baseW * 0.8, cy + s);
    ctx.moveTo(cx - topW, cy - s * 0.9);
    ctx.lineTo(cx + topW * 0.8, cy - s * 0.85);
    ctx.stroke();

    // Highlight streak
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.moveTo(cx - topW + 2, cy - s * 0.8);
    ctx.lineTo(cx - baseW + 3, cy + s * 0.5);
    ctx.lineTo(cx - baseW + 5, cy + s * 0.5);
    ctx.lineTo(cx - topW + 4, cy - s * 0.8);
    ctx.closePath();
    ctx.fill();

    // Tip glow
    ctx.fillStyle = `rgba(200, 255, 230, ${0.5 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.95, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  _renderCluster(ctx, cx, cy, s, pulse) {
    // Multiple crystal spikes
    for (const c of this.crystals) {
      ctx.save();
      ctx.translate(cx + c.offset * s, cy + c.offset * s * 0.5);
      ctx.rotate(c.angle);

      const h = s * c.len * 2;
      const w = s * c.width;

      // Crystal spike body
      const crystGrad = ctx.createLinearGradient(-w, 0, w, -h);
      crystGrad.addColorStop(0, CONFIG.COLORS.OBSTACLE_ACCENT);
      crystGrad.addColorStop(0.5, CONFIG.COLORS.OBSTACLE);
      crystGrad.addColorStop(1, '#aaffcc');
      ctx.fillStyle = crystGrad;

      ctx.beginPath();
      ctx.moveTo(-w, h * 0.2);
      ctx.lineTo(0, -h * 0.5);
      ctx.lineTo(w, h * 0.2);
      ctx.closePath();
      ctx.fill();

      // Facet
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.beginPath();
      ctx.moveTo(-w * 0.5, h * 0.1);
      ctx.lineTo(0, -h * 0.5);
      ctx.lineTo(0, h * 0.1);
      ctx.closePath();
      ctx.fill();

      // Tip
      ctx.fillStyle = `rgba(200, 255, 230, ${0.3 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(0, -h * 0.45, 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Central glowing core
    ctx.shadowBlur = 0;
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.3);
    coreGrad.addColorStop(0, `rgba(200, 255, 230, ${0.25 * pulse})`);
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
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
      CONFIG.OBSTACLE_MIN_PER_WAVE + Math.floor(wave * 1.2)
    );

    const gridCols = Math.floor(CONFIG.GAME_WIDTH / CONFIG.OBSTACLE_SIZE);
    const gridRows = Math.floor(
      (CONFIG.OBSTACLE_MAX_Y - CONFIG.OBSTACLE_MIN_Y) / CONFIG.OBSTACLE_SIZE
    );
    const usedCells = new Set();
    const pattern = wave % 3;

    for (let i = 0; i < count; i++) {
      let attempts = 0;
      while (attempts < 30) {
        let col, row;

        if (pattern === 0) {
          col = 1 + Math.floor(Math.random() * (gridCols - 2));
          row = Math.floor(Math.random() * gridRows);
        } else if (pattern === 1) {
          col = Math.random() < 0.5
            ? 1 + Math.floor(Math.random() * 3)
            : gridCols - 4 + Math.floor(Math.random() * 3);
          row = Math.floor(Math.random() * gridRows);
        } else {
          col = Math.floor(gridCols / 2 - 3 + Math.random() * 6);
          row = Math.floor(Math.random() * gridRows);
        }

        col = Math.max(1, Math.min(col, gridCols - 2));
        const key = `${col},${row}`;

        if (!usedCells.has(key)) {
          usedCells.add(key);
          this.obstacles.push(new Obstacle(
            col * CONFIG.OBSTACLE_SIZE,
            CONFIG.OBSTACLE_MIN_Y + row * CONFIG.OBSTACLE_SIZE,
            Math.floor(Math.random() * 3)
          ));
          break;
        }
        attempts++;
      }
    }
  }

  update() {
    for (const obs of this.obstacles) obs.update();
  }

  render(ctx) {
    for (const obs of this.obstacles) obs.render(ctx);
  }

  clear() {
    this.obstacles = [];
  }
}
