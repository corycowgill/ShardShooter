// Shard chain enemy system - the core mechanic
import { CONFIG } from './config.js';

const SHARD_COLORS = [
  CONFIG.COLORS.SHARD_PRIMARY,
  CONFIG.COLORS.SHARD_SECONDARY,
  CONFIG.COLORS.SHARD_TERTIARY,
];

// Pre-compute per-color darker shade for facets
function darken(hex, amount) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

function lighten(hex, amount) {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

export class ShardSegment {
  constructor(x, y, hp = CONFIG.SHARD_HP, colorIndex = 0) {
    this.x = x;
    this.y = y;
    this.size = CONFIG.SHARD_SIZE;
    this.hp = hp;
    this.maxHp = hp;
    this.alive = true;
    this.colorIndex = colorIndex;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.flashTimer = 0;
    // Each segment gets a slight random rotation for visual variety
    this.rotOffset = (Math.random() - 0.5) * 0.15;
  }

  get color() {
    return SHARD_COLORS[this.colorIndex % SHARD_COLORS.length];
  }

  get centerX() {
    return this.x + this.size / 2;
  }

  get centerY() {
    return this.y + this.size / 2;
  }

  get hitbox() {
    return {
      x: this.x,
      y: this.y,
      width: this.size,
      height: this.size,
    };
  }

  hit(damage = 1) {
    this.hp -= damage;
    this.flashTimer = 8;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }

  render(ctx) {
    if (!this.alive) return;

    const cx = this.centerX;
    const cy = this.centerY;
    const s = this.size / 2 - CONFIG.SHARD_PADDING;
    this.pulsePhase += 0.04;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotOffset);

    const pulse = 0.7 + Math.sin(this.pulsePhase) * 0.3;
    const baseColor = this.color;
    const isFlashing = this.flashTimer > 0;
    if (isFlashing) this.flashTimer--;

    // --- Outer corona glow (radial, larger than shard) ---
    const coronaGrad = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, s * 1.6);
    coronaGrad.addColorStop(0, isFlashing ? 'rgba(255,255,255,0.3)' : (baseColor + '22'));
    coronaGrad.addColorStop(0.5, isFlashing ? 'rgba(255,255,255,0.1)' : (baseColor + '0a'));
    coronaGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coronaGrad;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Outer glow aura on shadow
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 12 * pulse;

    // --- Main hex shape ---
    const hexPath = new Path2D();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = Math.cos(angle) * s;
      const py = Math.sin(angle) * s;
      if (i === 0) hexPath.moveTo(px, py);
      else hexPath.lineTo(px, py);
    }
    hexPath.closePath();

    // Fill: richer gradient from base color to darker
    if (isFlashing) {
      ctx.fillStyle = '#ffffff';
    } else {
      const grad = ctx.createLinearGradient(-s, -s, s, s);
      grad.addColorStop(0, lighten(baseColor, 40));
      grad.addColorStop(0.35, baseColor);
      grad.addColorStop(0.7, darken(baseColor, 40));
      grad.addColorStop(1, darken(baseColor, 70));
      ctx.fillStyle = grad;
    }
    ctx.fill(hexPath);

    // Outline with subtle double-stroke
    ctx.shadowBlur = 0;
    if (isFlashing) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
    } else {
      ctx.strokeStyle = lighten(baseColor, 60);
      ctx.lineWidth = 0.9;
    }
    ctx.stroke(hexPath);

    // --- Inner facet detail: 3 triangular facets with better shading ---
    if (!isFlashing) {
      // Top facet (lit, brighter)
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = lighten(baseColor, 70);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.85);
      ctx.lineTo(s * 0.45, -s * 0.1);
      ctx.lineTo(-s * 0.45, -s * 0.1);
      ctx.closePath();
      ctx.fill();

      // Bottom-right facet (shadow)
      ctx.fillStyle = darken(baseColor, 50);
      ctx.beginPath();
      ctx.moveTo(s * 0.45, -s * 0.1);
      ctx.lineTo(s * 0.65, s * 0.55);
      ctx.lineTo(0, s * 0.35);
      ctx.closePath();
      ctx.fill();

      // Bottom-left facet
      ctx.fillStyle = darken(baseColor, 25);
      ctx.beginPath();
      ctx.moveTo(-s * 0.45, -s * 0.1);
      ctx.lineTo(0, s * 0.35);
      ctx.lineTo(-s * 0.65, s * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // --- Crystalline fracture veins ---
      ctx.strokeStyle = lighten(baseColor, 80) + '44';
      ctx.lineWidth = 0.5;
      // Vein 1: center to top-right
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.1);
      ctx.lineTo(s * 0.3, -s * 0.5);
      ctx.lineTo(s * 0.5, -s * 0.3);
      ctx.stroke();
      // Vein 2: center to bottom-left
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.1);
      ctx.lineTo(-s * 0.25, s * 0.25);
      ctx.lineTo(-s * 0.5, s * 0.4);
      ctx.stroke();
      // Vein 3: center to right
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.1);
      ctx.lineTo(s * 0.4, s * 0.15);
      ctx.stroke();

      // --- Animated energy core ---
      const coreGrad = ctx.createRadialGradient(0, -s * 0.05, 0, 0, -s * 0.05, s * 0.35);
      coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.25 + pulse * 0.2})`);
      coreGrad.addColorStop(0.4, baseColor + Math.floor((0.2 + pulse * 0.15) * 255).toString(16).padStart(2, '0'));
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, -s * 0.05, s * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center bright point (larger, pulsing)
    ctx.fillStyle = isFlashing ? '#ffffff' : `rgba(255, 255, 255, ${0.35 + pulse * 0.35})`;
    ctx.shadowColor = isFlashing ? '#ffffff' : baseColor;
    ctx.shadowBlur = isFlashing ? 8 : 4;
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Specular glint (top-left, sharper)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(-s * 0.28, -s * 0.5, s * 0.2, s * 0.06, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Secondary glint (bottom-right, faint)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.06 + pulse * 0.06})`;
    ctx.beginPath();
    ctx.ellipse(s * 0.2, s * 0.25, s * 0.12, s * 0.04, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // HP bar for armored shards (hp > 1)
    if (this.maxHp > 1 && !isFlashing) {
      const barW = s * 1.3;
      const barH = 2.5;
      const barX = -barW / 2;
      const barY = s + 3;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(barX, barY, barW, barH);
      const hpGrad = ctx.createLinearGradient(barX, barY, barX + barW, barY);
      hpGrad.addColorStop(0, CONFIG.COLORS.SHARD_ARMORED);
      hpGrad.addColorStop(1, '#ffaa33');
      ctx.fillStyle = hpGrad;
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
      ctx.strokeStyle = 'rgba(255, 200, 150, 0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(barX, barY, barW, barH);
    }

    ctx.restore();
  }
}

export class ShardChain {
  constructor(segments, direction, speed) {
    this.segments = segments;
    this.direction = direction;
    this.speed = speed;
    this.dropStep = CONFIG.SHARD_DROP_STEP;
    this.alive = true;
  }

  static create(startX, startY, length, speed, colorIndex = 0, hp = 1) {
    const segments = [];
    const segSize = CONFIG.SHARD_SIZE;
    for (let i = 0; i < length; i++) {
      segments.push(new ShardSegment(
        startX + i * segSize,
        startY,
        hp,
        colorIndex
      ));
    }
    const dir = Math.random() < 0.5 ? 1 : -1;
    return new ShardChain(segments, dir, speed);
  }

  update(obstacles) {
    if (!this.alive) return;

    this.segments = this.segments.filter(s => s.alive);
    if (this.segments.length === 0) {
      this.alive = false;
      return;
    }

    const dx = this.speed * this.direction;
    for (const seg of this.segments) {
      seg.x += dx;
    }

    let hitEdge = false;
    for (const seg of this.segments) {
      if (seg.x <= 0 || seg.x + seg.size >= CONFIG.GAME_WIDTH) {
        hitEdge = true;
        break;
      }
      for (const obs of obstacles) {
        if (rectsOverlap(seg.hitbox, obs.hitbox)) {
          hitEdge = true;
          break;
        }
      }
      if (hitEdge) break;
    }

    if (hitEdge) {
      for (const seg of this.segments) {
        seg.x -= dx;
      }
      this.direction *= -1;
      for (const seg of this.segments) {
        seg.y += this.dropStep;
      }
    }
  }

  destroySegment(segment) {
    const index = this.segments.indexOf(segment);
    if (index === -1) return [];

    segment.alive = false;

    const left = this.segments.slice(0, index).filter(s => s.alive);
    const right = this.segments.slice(index + 1).filter(s => s.alive);

    this.alive = false;

    const newChains = [];
    if (left.length > 0) {
      newChains.push(new ShardChain(left, this.direction, this.speed));
    }
    if (right.length > 0) {
      newChains.push(new ShardChain(right, -this.direction, this.speed));
    }
    return newChains;
  }

  get lowestY() {
    let maxY = 0;
    for (const seg of this.segments) {
      if (seg.y + seg.size > maxY) maxY = seg.y + seg.size;
    }
    return maxY;
  }

  hasReachedBottom() {
    return this.lowestY >= CONFIG.GAME_HEIGHT - CONFIG.PLAYER_Y_OFFSET - 10;
  }

  render(ctx) {
    if (!this.alive) return;

    // Energy link lines between segments — animated plasma connectors
    ctx.save();
    for (let i = 0; i < this.segments.length - 1; i++) {
      const a = this.segments[i];
      const b = this.segments[i + 1];
      if (a.alive && b.alive) {
        const mx = (a.centerX + b.centerX) / 2;
        const my = (a.centerY + b.centerY) / 2;
        const phase = a.pulsePhase + i;

        // Outer energy glow beam
        const grad = ctx.createLinearGradient(a.centerX, a.centerY, b.centerX, b.centerY);
        grad.addColorStop(0, a.color + '55');
        grad.addColorStop(0.5, '#ffffff33');
        grad.addColorStop(1, b.color + '55');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 3;
        ctx.shadowColor = a.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(a.centerX, a.centerY);
        // Slight sine wave for energy crackle
        const waveAmp = 1.5 * Math.sin(phase * 3);
        ctx.quadraticCurveTo(mx, my + waveAmp, b.centerX, b.centerY);
        ctx.stroke();

        // Bright inner line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 0.8;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(a.centerX, a.centerY);
        ctx.lineTo(b.centerX, b.centerY);
        ctx.stroke();

        // Travelling energy pulse dot
        const pulseT = (Math.sin(phase * 2) + 1) * 0.5;
        const px = a.centerX + (b.centerX - a.centerX) * pulseT;
        const py = a.centerY + (b.centerY - a.centerY) * pulseT;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    for (const seg of this.segments) {
      seg.render(ctx);
    }
  }
}

export class ShardManager {
  constructor() {
    this.chains = [];
  }

  addChain(chain) {
    this.chains.push(chain);
  }

  update(obstacles) {
    for (const chain of this.chains) {
      chain.update(obstacles);
    }
    this.chains = this.chains.filter(c => c.alive && c.segments.length > 0);
  }

  destroySegment(chain, segment) {
    const newChains = chain.destroySegment(segment);
    for (const nc of newChains) {
      this.chains.push(nc);
    }
    this.chains = this.chains.filter(c => c.alive && c.segments.length > 0);
    return newChains.length;
  }

  getAllSegments() {
    const segs = [];
    for (const chain of this.chains) {
      for (const seg of chain.segments) {
        if (seg.alive) segs.push({ chain, segment: seg });
      }
    }
    return segs;
  }

  get totalSegments() {
    let count = 0;
    for (const chain of this.chains) {
      for (const seg of chain.segments) {
        if (seg.alive) count++;
      }
    }
    return count;
  }

  hasReachedBottom() {
    for (const chain of this.chains) {
      if (chain.hasReachedBottom()) return true;
    }
    return false;
  }

  render(ctx) {
    for (const chain of this.chains) {
      chain.render(ctx);
    }
  }

  clear() {
    this.chains = [];
  }
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}
