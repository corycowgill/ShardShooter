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

    // Outer glow aura
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 10 * pulse;

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

    // Fill: gradient from base color to darker
    if (isFlashing) {
      ctx.fillStyle = '#ffffff';
    } else {
      const grad = ctx.createLinearGradient(-s, -s, s, s);
      grad.addColorStop(0, lighten(baseColor, 30));
      grad.addColorStop(0.5, baseColor);
      grad.addColorStop(1, darken(baseColor, 60));
      ctx.fillStyle = grad;
    }
    ctx.fill(hexPath);

    // Outline
    ctx.shadowBlur = 0;
    ctx.strokeStyle = isFlashing ? '#ffffff' : lighten(baseColor, 50);
    ctx.lineWidth = 0.8;
    ctx.stroke(hexPath);

    // --- Inner facet detail: 3 triangular facets ---
    if (!isFlashing) {
      ctx.globalAlpha = 0.25;
      // Top facet (brighter)
      ctx.fillStyle = lighten(baseColor, 60);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(s * 0.4, -s * 0.1);
      ctx.lineTo(-s * 0.4, -s * 0.1);
      ctx.closePath();
      ctx.fill();

      // Bottom-right facet (darker)
      ctx.fillStyle = darken(baseColor, 40);
      ctx.beginPath();
      ctx.moveTo(s * 0.4, -s * 0.1);
      ctx.lineTo(s * 0.6, s * 0.5);
      ctx.lineTo(0, s * 0.3);
      ctx.closePath();
      ctx.fill();

      // Bottom-left facet
      ctx.fillStyle = darken(baseColor, 20);
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.1);
      ctx.lineTo(0, s * 0.3);
      ctx.lineTo(-s * 0.6, s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Center bright point
    ctx.fillStyle = isFlashing ? '#ffffff' : `rgba(255, 255, 255, ${0.3 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Specular glint (top-left)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + pulse * 0.15})`;
    ctx.beginPath();
    ctx.ellipse(-s * 0.25, -s * 0.45, s * 0.18, s * 0.08, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // HP bar for armored shards (hp > 1)
    if (this.maxHp > 1 && !isFlashing) {
      const barW = s * 1.2;
      const barH = 2;
      const barX = -barW / 2;
      const barY = s + 3;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = CONFIG.COLORS.SHARD_ARMORED;
      ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
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

    // Energy link lines between segments
    ctx.save();
    for (let i = 0; i < this.segments.length - 1; i++) {
      const a = this.segments[i];
      const b = this.segments[i + 1];
      if (a.alive && b.alive) {
        // Gradient energy beam connector
        const grad = ctx.createLinearGradient(a.centerX, a.centerY, b.centerX, b.centerY);
        grad.addColorStop(0, a.color + '66');
        grad.addColorStop(0.5, '#ffffff44');
        grad.addColorStop(1, b.color + '66');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(a.centerX, a.centerY);
        ctx.lineTo(b.centerX, b.centerY);
        ctx.stroke();

        // Thin bright inner line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(a.centerX, a.centerY);
        ctx.lineTo(b.centerX, b.centerY);
        ctx.stroke();
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
