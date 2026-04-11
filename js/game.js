// Main game engine - state machine, game loop, orchestration
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Player } from './player.js';
import { ProjectileManager } from './projectile.js';
import { ShardChain, ShardManager } from './shard.js';
import { ObstacleManager } from './obstacle.js';
import { HazardManager } from './hazard.js';
import { PowerUpManager, POWERUP_TYPES } from './powerup.js';
import { ParticleSystem } from './particle.js';
import { CollisionSystem } from './collision.js';
import { UI } from './ui.js';

const STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  WAVE_INTRO: 'wave_intro',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
};

const STORAGE_KEY = 'shardRushHighScore';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);

    // Core systems
    this.player = new Player();
    this.bullets = new ProjectileManager();
    this.shards = new ShardManager();
    this.obstacles = new ObstacleManager();
    this.hazards = new HazardManager();
    this.powerups = new PowerUpManager();
    this.particles = new ParticleSystem();
    this.collisions = new CollisionSystem();
    this.ui = new UI();

    // Game state
    this.state = STATES.MENU;
    this.score = 0;
    this.highScore = this._loadHighScore();
    this.wave = 0;
    this.combo = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.isNewHighScore = false;
    this.lastScoreMilestone = 0;
    this.totalShardsDestroyed = 0;

    // Timing
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedStep = 1000 / 60;
    this.time = 0;

    // Screen shake
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    // Menu button bounds
    this.menuButton = null;

    // Pause handling
    this.input.pauseAction = () => this._togglePause();

    // Start the loop
    this._resize();
    window.addEventListener('resize', () => this._resize());
    requestAnimationFrame((t) => this._loop(t));
  }

  _resize() {
    const container = this.canvas.parentElement;
    const maxW = container.clientWidth;
    const maxH = container.clientHeight;

    const gameAspect = CONFIG.GAME_WIDTH / CONFIG.GAME_HEIGHT;
    const screenAspect = maxW / maxH;

    let canvasW, canvasH;
    if (screenAspect > gameAspect) {
      canvasH = maxH;
      canvasW = maxH * gameAspect;
    } else {
      canvasW = maxW;
      canvasH = maxW / gameAspect;
    }

    this.canvas.style.width = `${canvasW}px`;
    this.canvas.style.height = `${canvasH}px`;
    this.canvas.width = CONFIG.GAME_WIDTH;
    this.canvas.height = CONFIG.GAME_HEIGHT;
  }

  _loop(timestamp) {
    const dt = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;
    this.time = timestamp;
    this.accumulator += dt;

    while (this.accumulator >= this.fixedStep) {
      this._update(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }

    this._render();
    requestAnimationFrame((t) => this._loop(t));
  }

  _update(dt) {
    this.input.pollGamepad();
    this.ui.update(dt);

    switch (this.state) {
      case STATES.MENU:
        this._updateMenu();
        break;
      case STATES.WAVE_INTRO:
        this._updateWaveIntro(dt);
        break;
      case STATES.PLAYING:
        this._updatePlaying(dt);
        break;
      case STATES.PAUSED:
        this._updatePaused();
        break;
      case STATES.GAME_OVER:
        this._updateGameOver();
        break;
    }

    this.particles.update();

    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt;
    }
  }

  _updateMenu() {
    if (this.input.isConfirm()) {
      this.input.consumeConfirm();
      this._startGame();
      return;
    }

    if (this.input.touchActive && this.menuButton) {
      if (this.input.isTapInRect(
        this.menuButton.x, this.menuButton.y,
        this.menuButton.width, this.menuButton.height
      )) {
        this.input.touchActive = false;
        this._startGame();
      }
    }
  }

  _updateWaveIntro(dt) {
    if (this.ui.waveAnnounceTimer <= 0) {
      this.state = STATES.PLAYING;
    }
  }

  _updatePlaying(dt) {
    this.player.update(this.input, dt);

    // Pause from touch
    if (this.input.touchActive) {
      const tx = this.input.touchX;
      const ty = this.input.touchY;
      if (this.ui.isPauseButtonHit(tx, ty)) {
        this.input.touchActive = false;
        this._togglePause();
        return;
      }
    }

    // Shooting - auto-fire with power-up modifications
    const now = performance.now();
    const rapidFire = this.powerups.hasEffect(POWERUP_TYPES.RAPID_FIRE);
    const spreadShot = this.powerups.hasEffect(POWERUP_TYPES.SPREAD_SHOT);
    const fireRate = rapidFire ? CONFIG.FIRE_RATE * 0.4 : CONFIG.FIRE_RATE;

    if (this.player.alive && now - this.player.lastFireTime >= fireRate) {
      this.player.lastFireTime = now;
      const cx = this.player.x + this.player.width / 2;
      const baseY = this.player.y - CONFIG.BULLET_HEIGHT;

      // Center shot
      this.bullets.add(cx - CONFIG.BULLET_WIDTH / 2, baseY);

      if (spreadShot) {
        // Two angled side shots
        this.bullets.addAngled(cx - 8, baseY + 3, -0.15);
        this.bullets.addAngled(cx + 5, baseY + 3, 0.15);
      }

      Audio.shoot();
      this.particles.trail(cx, baseY + CONFIG.BULLET_HEIGHT, CONFIG.COLORS.BULLET);
    }

    // Update entities
    this.bullets.update();
    this.shards.update(this.obstacles.obstacles);
    this.obstacles.update();
    this.hazards.update(this.wave, this.player.centerX, dt);
    this.powerups.update(dt);

    // Bullet trails
    let trails = 0;
    for (const b of this.bullets.bullets) {
      if (trails >= 8) break;
      if (Math.random() < 0.2) {
        this.particles.trail(b.centerX, b.y + b.height, CONFIG.COLORS.BULLET_GLOW);
        trails++;
      }
    }

    // Player engine trail
    if (this.player.alive && Math.random() < 0.4) {
      this.particles.trail(
        this.player.centerX + (Math.random() - 0.5) * 6,
        this.player.y + this.player.height + 4,
        CONFIG.COLORS.PLAYER
      );
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboMultiplier = 1;
      }
    }

    // Collisions
    this._handleCollisions();

    // Power-up collection
    this._handlePowerups();

    // Check wave clear
    if (this.shards.totalSegments === 0 && this.state === STATES.PLAYING) {
      this.ui.flash('#00e5ff', 0.15);
      this._nextWave();
    }

    // Shard chains reaching bottom
    if (this.shards.hasReachedBottom()) {
      if (!this.powerups.hasEffect(POWERUP_TYPES.SHIELD) && this.player.hit()) {
        Audio.playerHit();
        this.particles.playerHitEffect(this.player.centerX, this.player.centerY);
        this._shake(CONFIG.SHAKE_INTENSITY * 1.5, CONFIG.SHAKE_DURATION * 2);
        this.ui.flash('#ff1744', 0.25);
        if (!this.player.alive) {
          this._gameOver();
        }
      }
    }
  }

  _updatePaused() {
    if (this.input.touchActive && this.menuButton) {
      if (this.input.isTapInRect(
        this.menuButton.x, this.menuButton.y,
        this.menuButton.width, this.menuButton.height
      )) {
        this.input.touchActive = false;
        this._togglePause();
      }
    }
  }

  _updateGameOver() {
    if (this.input.isConfirm()) {
      this.input.consumeConfirm();
      this._startGame();
      return;
    }

    if (this.input.touchActive && this.menuButton) {
      if (this.input.isTapInRect(
        this.menuButton.x, this.menuButton.y,
        this.menuButton.width, this.menuButton.height
      )) {
        this.input.touchActive = false;
        this._startGame();
      }
    }
  }

  _handleCollisions() {
    // Bullets vs obstacles
    this.collisions.checkBulletsVsObstacles(this.bullets, this.obstacles);

    // Bullets vs shards
    const scoring = {
      addShardKill: (x, y) => {
        this.combo++;
        this.comboTimer = CONFIG.COMBO_TIMEOUT;
        this.comboMultiplier = Math.min(
          CONFIG.COMBO_MAX_MULTIPLIER,
          1 + (this.combo - 1) * CONFIG.COMBO_MULTIPLIER_STEP
        );
        const points = Math.floor(CONFIG.SCORE_PER_SHARD * this.comboMultiplier);
        this.score += points;
        this.totalShardsDestroyed++;
        this._checkScoreMilestones();

        // Floating score text
        this.ui.addFloatingText(x, y, `+${points}`, CONFIG.COLORS.UI_SCORE);

        if (this.combo > 1) {
          this.ui.showCombo(this.comboMultiplier);
        }
        if (this.combo > 0 && this.combo % 5 === 0) {
          this.ui.flash(CONFIG.COLORS.UI_SCORE, 0.1);
        }

        // Power-up drop chance
        this.powerups.trySpawn(x, y);
      },
      addChainSplitBonus: (x, y) => {
        this.score += CONFIG.SCORE_CHAIN_SPLIT_BONUS;
        this.ui.addFloatingText(x, y - 12, 'SPLIT!', CONFIG.COLORS.UI_TITLE_PRIMARY);
        this._shake(2, 80);
        this.ui.flash(CONFIG.COLORS.SHARD_PRIMARY, 0.08);
      },
    };

    this.collisions.checkBulletsVsShards(
      this.bullets, this.shards, this.particles, Audio, scoring
    );

    // Player vs shards
    const shieldActive = this.powerups.hasEffect(POWERUP_TYPES.SHIELD);
    if (!shieldActive && this.collisions.checkPlayerVsShards(this.player, this.shards)) {
      if (this.player.hit()) {
        Audio.playerHit();
        this.particles.playerHitEffect(this.player.centerX, this.player.centerY);
        this._shake(CONFIG.SHAKE_INTENSITY, CONFIG.SHAKE_DURATION);
        this.ui.flash('#ff1744', 0.25);
        if (!this.player.alive) {
          this._gameOver();
        }
      }
    }

    // Player vs hazards
    if (!shieldActive && this.collisions.checkPlayerVsHazards(this.player, this.hazards)) {
      if (this.player.hit()) {
        Audio.playerHit();
        this.particles.playerHitEffect(this.player.centerX, this.player.centerY);
        this._shake(CONFIG.SHAKE_INTENSITY, CONFIG.SHAKE_DURATION);
        this.ui.flash('#ff1744', 0.25);
        if (!this.player.alive) {
          this._gameOver();
        }
      }
    }
  }

  _handlePowerups() {
    if (!this.player.alive) return;

    const collected = this.powerups.checkCollection(this.player.hitbox);
    if (!collected) return;

    Audio.powerUp();
    this.particles.explode(collected.x, collected.y, collected.def.color, 12);
    this.ui.flash(collected.def.color, 0.12);

    switch (collected.type) {
      case POWERUP_TYPES.RAPID_FIRE:
      case POWERUP_TYPES.SPREAD_SHOT:
      case POWERUP_TYPES.SHIELD:
        this.powerups.activateEffect(collected.type);
        this.ui.showPowerupNotify(collected.def.description, collected.def.color);
        break;
      case POWERUP_TYPES.EXTRA_LIFE:
        this.player.lives = Math.min(this.player.lives + 1, 5);
        this.ui.showPowerupNotify('EXTRA LIFE!', collected.def.color);
        break;
      case POWERUP_TYPES.SCORE_BURST:
        this.score += 500;
        this.ui.showPowerupNotify('+500 POINTS!', collected.def.color);
        this.ui.addFloatingText(collected.x, collected.y, '+500', collected.def.color);
        break;
    }
  }

  _startGame() {
    Audio.init();
    Audio.startMusic();

    this.score = 0;
    this.wave = 0;
    this.combo = 0;
    this.comboMultiplier = 1;
    this.comboTimer = 0;
    this.isNewHighScore = false;
    this.lastScoreMilestone = 0;
    this.totalShardsDestroyed = 0;

    this.player.reset();
    this.bullets.clear();
    this.shards.clear();
    this.obstacles.clear();
    this.hazards.clear();
    this.powerups.clear();
    this.particles.clear();
    this.input.reset();

    this._nextWave();
  }

  _nextWave() {
    this.wave++;
    this.score += CONFIG.WAVE_CLEAR_BONUS * (this.wave > 1 ? 1 : 0);

    // Generate obstacles
    this.obstacles.generate(this.wave);

    // Generate shard chains with varied formations
    const numChains = Math.min(
      CONFIG.WAVE_MAX_CHAINS,
      Math.floor(CONFIG.WAVE_BASE_CHAINS + (this.wave - 1) * CONFIG.WAVE_CHAIN_INCREMENT)
    );
    const chainLength = Math.min(
      CONFIG.WAVE_MAX_LENGTH,
      Math.floor(CONFIG.WAVE_BASE_LENGTH + (this.wave - 1) * CONFIG.WAVE_LENGTH_INCREMENT)
    );
    const speedMult = Math.min(CONFIG.DIFFICULTY_MAX_SPEED_MULT, 1 + (this.wave - 1) * CONFIG.DIFFICULTY_SPEED_SCALE);
    const speed = CONFIG.SHARD_BASE_SPEED * speedMult + (this.wave - 1) * CONFIG.SHARD_SPEED_INCREMENT;

    const formation = this.wave % 5;

    for (let i = 0; i < numChains; i++) {
      let startX, startY, len, spd, hp;

      if (formation === 0) {
        // Standard stacked rows
        const maxStartX = CONFIG.GAME_WIDTH - chainLength * CONFIG.SHARD_SIZE;
        startX = 10 + Math.random() * Math.max(0, maxStartX - 20);
        startY = 30 + i * (CONFIG.SHARD_SIZE + 15);
        len = chainLength;
        spd = speed;
      } else if (formation === 1) {
        // V-formation: chains offset to form a V shape
        const halfChains = numChains / 2;
        const depth = Math.abs(i - halfChains) * 12;
        len = Math.max(3, chainLength - Math.abs(i - Math.floor(halfChains)));
        const maxStartX = CONFIG.GAME_WIDTH - len * CONFIG.SHARD_SIZE;
        startX = (CONFIG.GAME_WIDTH - len * CONFIG.SHARD_SIZE) / 2;
        startX += (i - halfChains) * 15;
        startX = Math.max(5, Math.min(startX, maxStartX));
        startY = 25 + depth + i * 5;
        spd = speed;
      } else if (formation === 2) {
        // Echelon: diagonal stagger
        len = Math.max(3, chainLength - Math.floor(i * 0.5));
        const maxStartX = CONFIG.GAME_WIDTH - len * CONFIG.SHARD_SIZE;
        startX = 10 + i * 25;
        startX = Math.min(startX, maxStartX);
        startY = 25 + i * (CONFIG.SHARD_SIZE + 10);
        spd = speed * (0.9 + i * 0.05);
      } else if (formation === 3) {
        // Short fast chains - more chains, shorter, faster
        len = Math.max(2, Math.floor(chainLength * 0.5));
        const maxStartX = CONFIG.GAME_WIDTH - len * CONFIG.SHARD_SIZE;
        startX = Math.random() * Math.max(10, maxStartX);
        startY = 20 + i * (CONFIG.SHARD_SIZE + 8);
        spd = speed * 1.3;
      } else {
        // Wide wall: long chains stacked tight
        len = Math.min(CONFIG.WAVE_MAX_LENGTH, chainLength + 2);
        const maxStartX = CONFIG.GAME_WIDTH - len * CONFIG.SHARD_SIZE;
        startX = Math.max(2, maxStartX / 2 + (Math.random() - 0.5) * 20);
        startY = 25 + i * (CONFIG.SHARD_SIZE + 4);
        spd = speed * 0.8;
      }

      const colorIndex = i % 3;
      hp = this.wave >= 8 && Math.random() < 0.3 ? 2 : 1;
      // Boss-style armored chains every 10 waves
      if (this.wave % 10 === 0) hp = Math.min(3, hp + 1);

      startX = Math.max(2, startX);
      startY = Math.max(15, startY);

      const chain = ShardChain.create(startX, startY, len, spd, colorIndex, hp);
      this.shards.addChain(chain);
    }

    Audio.enemySpawn();

    this.state = STATES.WAVE_INTRO;
    this.ui.announceWave(this.wave);
  }

  _gameOver() {
    this.state = STATES.GAME_OVER;
    Audio.stopMusic();
    Audio.gameOver();
    this.ui.flash('#ff1744', 0.4);

    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.isNewHighScore = true;
      this._saveHighScore();
    }
  }

  _togglePause() {
    if (this.state === STATES.PLAYING) {
      this.state = STATES.PAUSED;
    } else if (this.state === STATES.PAUSED) {
      this.state = STATES.PLAYING;
    }
  }

  _shake(intensity, duration) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  _checkScoreMilestones() {
    const milestone = Math.floor(this.score / 500) * 500;
    if (milestone > this.lastScoreMilestone && milestone > 0) {
      this.lastScoreMilestone = milestone;
      this.ui.showMilestone(milestone);
      Audio.scoreMilestone();
    }
  }

  _loadHighScore() {
    try {
      return parseInt(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
      return 0;
    }
  }

  _saveHighScore() {
    try {
      localStorage.setItem(STORAGE_KEY, this.highScore.toString());
    } catch { /* noop */ }
  }

  _render() {
    const ctx = this.ctx;
    ctx.save();

    // Screen shake
    if (this.shakeTimer > 0) {
      const shakeFactor = this.shakeTimer / CONFIG.SHAKE_DURATION;
      const dx = (Math.random() - 0.5) * this.shakeIntensity * shakeFactor * 2;
      const dy = (Math.random() - 0.5) * this.shakeIntensity * shakeFactor * 2;
      ctx.translate(dx, dy);
    }

    // Background
    this.ui.renderBackground(ctx, this.time);

    if (this.state === STATES.MENU) {
      this.particles.update();
      if (Math.random() < 0.05) {
        this.particles.trail(
          Math.random() * CONFIG.GAME_WIDTH,
          Math.random() * CONFIG.GAME_HEIGHT,
          CONFIG.COLORS.SHARD_PRIMARY
        );
      }
      this.particles.render(ctx);

      this.menuButton = this.ui.renderMenuScreen(ctx, this.highScore, this.time);
    } else {
      // Render game world
      this.obstacles.render(ctx);
      this.hazards.render(ctx);
      this.shards.render(ctx);
      this.powerups.render(ctx);
      this.bullets.render(ctx);
      this.player.render(ctx);
      this.particles.render(ctx);
      this.ui.renderFloatingTexts(ctx);

      // Screen flash overlay
      this.ui.renderScreenFlash(ctx);

      // HUD
      this.ui.renderHUD(ctx, this.score, this.highScore, this.player.lives, this.wave, this.comboMultiplier);
      this.ui.renderPowerupTimers(ctx, this.powerups.activeEffects);

      if (this.state === STATES.WAVE_INTRO) {
        this.ui.renderWaveAnnounce(ctx);
      }

      if (this.state === STATES.PAUSED) {
        this.menuButton = this.ui.renderPauseScreen(ctx);
      }

      if (this.state === STATES.GAME_OVER) {
        this.menuButton = this.ui.renderGameOverScreen(
          ctx, this.score, this.highScore, this.isNewHighScore, this.wave, this.time
        );
      }
    }

    ctx.restore();
  }
}
