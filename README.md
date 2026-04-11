# Shard Rush

A fast-paced arcade action game built with HTML5 Canvas. Destroy descending shard chains before they reach you — but every hit splits them into more dangerous fragments.

## How to Run

Shard Rush requires a local HTTP server (ES modules don't work from `file://`).

**Option 1: Python**
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

**Option 2: Node.js**
```bash
npx serve .
# Open the URL shown in terminal
```

**Option 3: VS Code**
Use the "Live Server" extension — right-click `index.html` → Open with Live Server.

## Controls

### Desktop (keyboard)
| Key | Action |
|-----|--------|
| Arrow Left / A | Move left |
| Arrow Right / D | Move right |
| Auto-fire | Always on |
| P / Escape | Pause |

### Xbox / Gamepad
| Input | Action |
|-------|--------|
| Left Stick / D-Pad | Move (analog) |
| A / X / RB / RT | (auto-fire always on) |
| Start / Menu | Pause |
| A | Confirm (menus) |

### Mobile / Touch
- **Touch and drag** horizontally to move
- **Auto-fire** while touching the screen
- **Tap pause button** (top-right) to pause

## Gameplay

- Shard chains descend from the top and bounce left/right across the field
- Destroy segments to **split chains** into smaller, independent fragments
- More fragments = more chaos = higher difficulty
- Crystal obstacles deflect chains and block your shots
- Additional hazards appear as waves progress:
  - **Energy Orbs** — drifting sine-wave threats
  - **Ricochet Hazards** — bounce off walls unpredictably
  - **Diving Enemies** — hover, lock on, then dive at you
  - **Corruption Fields** — rise from below, squeezing your safe zone
- Score points per shard destroyed, with combo multipliers for rapid kills
- Chain split bonuses reward tactical shooting

## Architecture

```
index.html          Entry point
css/style.css       Responsive styling
js/
  main.js           Bootstrap
  config.js         All tuning constants
  game.js           State machine, main loop, orchestration
  player.js         Player entity and rendering
  projectile.js     Bullet management
  shard.js          Shard chain system (core mechanic)
  obstacle.js       Static crystal obstacles
  hazard.js         Energy orbs, ricochets, divers, corruption
  particle.js       Particle effects system
  collision.js      Collision detection
  input.js          Keyboard + touch input handling
  audio.js          Procedural sound via Web Audio API
  ui.js             HUD, menus, screens
```

### Key Design Decisions

- **Fixed internal resolution** (420×680) scaled to viewport — consistent gameplay across devices
- **Procedural audio** — no external files needed, instant load
- **Fixed timestep physics** — deterministic updates at 60fps regardless of render rate
- **Component architecture** — each system is independent with clear interfaces
- **All constants in config.js** — easy to tune gameplay balance

## Deployment

Static files only — deploy to any static host:

```bash
# Netlify, Vercel, GitHub Pages, S3, etc.
# Just upload the project root directory
```

No build step required.

## Stretch Backlog

- [ ] Power-ups (rapid fire, spread shot, shield, time slow)
- [ ] Multiple weapon types (spread, laser, homing)
- [ ] Boss waves every 10 levels
- [ ] Endless vs. campaign mode toggle
- [ ] Enhanced particle effects and screen shake polish
- [ ] Accessibility options (high contrast mode, reduced motion)
- [ ] Local leaderboard with name entry
- [ ] Gamepad/controller support
- [ ] Progressive Web App (PWA) offline support
- [ ] Persistent upgrade system between runs
