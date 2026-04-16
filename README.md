# Shard Rush

A fast-paced neon arcade shooter built entirely with vanilla HTML5 Canvas and JavaScript. Destroy descending shard chains before they reach you — but every hit splits them into smaller, faster fragments. No frameworks, no build step, no external assets.

## How to Play

Shard chains descend from the top of the screen, bouncing left and right. Your ship auto-fires upward. Shooting a segment out of a chain **splits** it into two independent chains, each continuing on its own path. More fragments mean more chaos — and more points.

### Core Loop

1. **Destroy shards** to score points and build your combo multiplier
2. **Split chains** strategically for bonus points and to create openings
3. **Collect power-ups** that drop from destroyed shards
4. **Survive** — if a chain reaches the bottom or an enemy hits you, you lose a life
5. **Boss waves** appear every 5 waves with armored formations and escorts

### Power-ups

| Icon | Type | Effect |
|------|------|--------|
| R | Rapid Fire | Doubled fire rate for 6s |
| S | Spread Shot | Triple-bullet fan for 7s |
| P | Pierce Shot | Bullets pass through up to 3 shards for 6s |
| H | Shield | Absorbs one hit for 5s |
| T | Time Slow | Enemies move at 35% speed for 5s |
| B | Crystal Bomb | Instantly destroys all shards and hazards on screen |
| + | Extra Life | Gain one life |
| $ | Score Burst | Instant +500 points |

### Scoring

- **10 points** per shard destroyed (multiplied by combo)
- **25 points** chain split bonus
- **200 points** wave clear bonus
- **300 points** flawless wave bonus (no damage taken)
- **Combo streaks** at 10/25/50 rapid kills award 100/300/750 bonus points
- **Extra life** every 5,000 points

## Controls

### Keyboard

| Key | Action |
|-----|--------|
| Arrow Left / A | Move left |
| Arrow Right / D | Move right |
| Shift / C | Dash (i-frames, cooldown) |
| P / Escape | Pause |
| Auto-fire | Always on |

### Xbox / Gamepad

| Input | Action |
|-------|--------|
| Left Stick / D-Pad | Move (analog) |
| B / LB | Dash |
| Start / Menu | Pause |
| A | Confirm (menus) |

### Mobile / Touch

- **Touch and drag** horizontally to move
- **Auto-fire** while touching
- **Tap pause icon** (top-right) to pause

## How to Run

Shard Rush uses ES modules, so it needs an HTTP server (not `file://`).

```bash
# Python
python3 -m http.server 8000

# Node.js
npx serve .

# VS Code — use the "Live Server" extension
```

No build step. No `npm install`. Just serve the root directory.

## Architecture

```
index.html              Entry point — canvas element + module script tag
css/style.css           Fullscreen responsive layout, touch-action: none
js/
  main.js          (11)  Bootstrap — instantiates Game on DOMContentLoaded
  config.js       (118)  Every tuning constant in one place
  game.js         (771)  State machine, main loop, orchestration
  player.js       (482)  Ship entity, movement, dash, afterimage trail, rendering
  projectile.js   (143)  Bullet management and comet-trail rendering
  shard.js        (464)  Shard chain system — the core splitting mechanic
  obstacle.js     (339)  Crystal obstacles that deflect chains and block bullets
  hazard.js       (560)  Energy orbs, ricochet hazards, diving enemies + telegraphs
  powerup.js      (312)  8 power-up types with weighted drop table
  particle.js     (473)  Particle effects — explosions, sparks, lightning, popups
  collision.js    (150)  AABB and circle-rect collision detection
  input.js        (247)  Unified keyboard + touch + gamepad input
  audio.js        (250)  Procedural sound and music via Web Audio API
  ui.js          (1260)  HUD, menus, title screen, pause, game over, overlays
  postfx.js        (93)  Bloom, chromatic aberration, scanlines, vignette, grain
```

~5,700 lines of JavaScript total. Line counts shown in parentheses.

### Design Decisions

- **Zero dependencies** — no frameworks, libraries, bundlers, or external assets. Everything is generated at runtime: graphics via Canvas 2D, audio via Web Audio oscillators and noise buffers, music via a procedural bass/arp loop.

- **Fixed internal resolution** — the game runs at 420x680 pixels, scaled to fit any viewport while preserving aspect ratio. This ensures consistent gameplay across phones, tablets, and desktops.

- **Fixed timestep physics** — the update loop runs at a locked 60fps using an accumulator pattern (`game.js:_loop`). Rendering can happen at any framerate without affecting game logic.

- **State machine** — `Game` cycles through `MENU`, `PLAYING`, `WAVE_INTRO`, `PAUSED`, and `GAME_OVER` states. Each state has its own update and render path.

- **Component architecture** — each system (player, shards, hazards, particles, etc.) is a self-contained ES module with its own update/render cycle. The `Game` class orchestrates them but doesn't reach into their internals.

- **Procedural audio** — every sound effect is synthesized on the fly with `OscillatorNode` and noise buffers. Background music is a looping pattern of bass, hi-hat, and arp sequences. No audio files to load.

- **Post-processing pipeline** — after the main render pass, `PostFX` applies bloom (offscreen canvas + blur), chromatic aberration, CRT scanlines, film grain, and a radial vignette. Chromatic aberration intensifies during screen shake.

### The Shard Chain Mechanic

The central mechanic is chain splitting. A `ShardChain` is a horizontal row of `ShardSegment` objects that move together, bouncing off screen edges and dropping down one step on each bounce. When a segment is destroyed:

1. The chain is split at that point into two new independent chains
2. Each new chain inherits the parent's speed and direction
3. Smaller chains are harder to hit but easier to clear
4. Chains that reach the bottom of the screen cost the player a life

This creates emergent difficulty scaling: aggressive shooting fragments chains quickly, flooding the field with fast-moving targets. Strategic players aim for segments that split chains into manageable groups.

## Deployment

Static files only — deploy to any static host (GitHub Pages, Netlify, Vercel, S3, Cloudflare Pages, etc.). Upload the project root. No build required.

## License

MIT
