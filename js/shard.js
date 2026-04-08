// Shard chain enemy system - the core mechanic
import { CONFIG } from './config.js';

const SHARD_COLORS = [
  CONFIG.COLORS.SHARD_PRIMARY,
  CONFIG.COLORS.SHARD_SECONDARY,
  CONFIG.COLORS.SHARD_TERTIARY,
];

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
    this.flashTimer = 6;
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

    // Glow
    const pulse = 0.7 + Math.sin(this.pulsePhase) * 0.3;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8 * pulse;

    // Flash white on hit
    if (this.flashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      this.flashTimer--;
    } else {
      ctx.fillStyle = this.color;
    }

    // Hexagonal shard shape
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + Math.cos(angle) * s;
      const py = cy + Math.sin(angle) * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Inner highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = cx + Math.cos(angle) * s * 0.5;
      const py = cy + Math.sin(angle) * s * 0.5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Connection lines to adjacent segments rendered by chain
    ctx.restore();
  }
}

export class ShardChain {
  constructor(segments, direction, speed) {
    this.segments = segments;
    this.direction = direction; // 1 or -1
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

    // Remove dead segments from edges (they were destroyed)
    this.segments = this.segments.filter(s => s.alive);
    if (this.segments.length === 0) {
      this.alive = false;
      return;
    }

    // Move all segments
    const dx = this.speed * this.direction;
    for (const seg of this.segments) {
      seg.x += dx;
    }

    // Check if any segment hit bounds or obstacle
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
      // Undo movement
      for (const seg of this.segments) {
        seg.x -= dx;
      }
      // Reverse direction
      this.direction *= -1;
      // Drop down
      for (const seg of this.segments) {
        seg.y += this.dropStep;
      }
    }
  }

  // Destroy a segment and return new chains from the split
  destroySegment(segment) {
    const index = this.segments.indexOf(segment);
    if (index === -1) return [];

    segment.alive = false;

    const left = this.segments.slice(0, index).filter(s => s.alive);
    const right = this.segments.slice(index + 1).filter(s => s.alive);

    this.alive = false; // This chain is replaced by its splits

    const newChains = [];
    if (left.length > 0) {
      newChains.push(new ShardChain(left, this.direction, this.speed));
    }
    if (right.length > 0) {
      newChains.push(new ShardChain(right, -this.direction, this.speed));
    }
    return newChains;
  }

  // Get lowest Y position of any segment
  get lowestY() {
    let maxY = 0;
    for (const seg of this.segments) {
      if (seg.y + seg.size > maxY) maxY = seg.y + seg.size;
    }
    return maxY;
  }

  // Has any segment reached the player zone?
  hasReachedBottom() {
    return this.lowestY >= CONFIG.GAME_HEIGHT - CONFIG.PLAYER_Y_OFFSET - 10;
  }

  render(ctx) {
    if (!this.alive) return;

    // Draw connection lines between segments
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < this.segments.length - 1; i++) {
      const a = this.segments[i];
      const b = this.segments[i + 1];
      if (a.alive && b.alive) {
        ctx.beginPath();
        ctx.moveTo(a.centerX, a.centerY);
        ctx.lineTo(b.centerX, b.centerY);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Draw segments
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

  // Handle a segment being destroyed, splitting the chain
  destroySegment(chain, segment) {
    const newChains = chain.destroySegment(segment);
    // Add new chains from the split
    for (const nc of newChains) {
      this.chains.push(nc);
    }
    // Remove dead chains
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

// Utility: rectangle overlap check
function rectsOverlap(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}
