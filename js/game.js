// Main game engine - state machine, game loop, orchestration
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Player } from './player.js';
import { ProjectileManager } from './projectile.js';
import { ShardChain, ShardManager } from './shard.js';
import { ObstacleManager } from './obstacle.js';
import { HazardManager } from './hazard.js';
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

    // Timing
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedStep = 1000 / 60; // 60fps physics
    this.time = 0;

    // Screen shake
    this.shakeTimer = 0;
    this.shakeIntensity = 0;

    // Menu button bounds (set during render)
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
    const dt = Math.min(timestamp - this.lastTime, 50); // cap delta
    this.lastTime = timestamp;
    this.time = timestamp;
    this.accumulator += dt;

    // Fixed timestep updates
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

    // Update shake
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

    // Check touch/click on play button
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
    // Player update
    this.player.update(this.input, dt);

    // Handle pause from touch on pause button area
    if (this.input.touchActive) {
      const tx = this.input.touchX;
      const ty = this.input.touchY;
      if (this.ui.isPauseButtonHit(tx, ty)) {
        this.input.touchActive = false;
        this._togglePause();
        return;
      }
    }

    // Shooting - always auto-fire for arcade feel
    const now = performance.now();
    if (this.player.canFire(now)) {
      const pos = this.player.fire(now);
      this.bullets.add(pos.x, pos.y);
      Audio.shoot();
      this.particles.trail(pos.x + CONFIG.BULLET_WIDTH / 2, pos.y + CONFIG.BULLET_HEIGHT, CONFIG.COLORS.BULLET);
    }

    // Update entities
    this.bullets.update();
    this.shards.update(this.obstacles.obstacles);
    this.obstacles.update();
    this.hazards.update(this.wave, this.player.centerX, dt);

    // Bullet trails (limit to avoid particle spam)
    const maxTrails = 8;
    let trails = 0;
    for (const b of this.bullets.bullets) {
      if (trails >= maxTrails) break;
      if (Math.random() < 0.25) {
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

    // Check wave clear
    if (this.shards.totalSegments === 0 && this.state === STATES.PLAYING) {
      this._nextWave();
    }

    // Check shard chains reaching bottom
    if (this.shards.hasReachedBottom()) {
      if (this.player.hit()) {
        Audio.playerHit();
        this.particles.playerHitEffect(this.player.centerX, this.player.centerY);
        this._shake(CONFIG.SHAKE_INTENSITY * 1.5, CONFIG.SHAKE_DURATION * 2);
        if (!this.player.alive) {
          this._gameOver();
        }
      }
    }
  }

  _updatePaused() {
    // Check touch on resume button
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
      addShardKill: () => {
        this.combo++;
        this.comboTimer = CONFIG.COMBO_TIMEOUT;
        this.comboMultiplier = Math.min(
          CONFIG.COMBO_MAX_MULTIPLIER,
          1 + (this.combo - 1) * CONFIG.COMBO_MULTIPLIER_STEP
        );
        const points = Math.floor(CONFIG.SCORE_PER_SHARD * this.comboMultiplier);
        this.score += points;
        this._checkScoreMilestones();

        if (this.combo > 1) {
          this.ui.showCombo(this.comboMultiplier);
        }
      },
      addChainSplitBonus: () => {
        this.score += CONFIG.SCORE_CHAIN_SPLIT_BONUS;
      },
    };

    this.collisions.checkBulletsVsShards(
      this.bullets, this.shards, this.particles, Audio, scoring
    );

    // Player vs shards
    if (this.collisions.checkPlayerVsShards(this.player, this.shards)) {
      if (this.player.hit()) {
        Audio.playerHit();
        this.particles.playerHitEffect(this.player.centerX, this.player.centerY);
        this._shake(CONFIG.SHAKE_INTENSITY, CONFIG.SHAKE_DURATION);
        if (!this.player.alive) {
          this._gameOver();
        }
      }
    }

    // Player vs hazards
    if (this.collisions.checkPlayerVsHazards(this.player, this.hazards)) {
      if (this.player.hit()) {
        Audio.playerHit();
        this.particles.playerHitEffect(this.player.centerX, this.player.centerY);
        this._shake(CONFIG.SHAKE_INTENSITY, CONFIG.SHAKE_DURATION);
        if (!this.player.alive) {
          this._gameOver();
        }
      }
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

    this.player.reset();
    this.bullets.clear();
    this.shards.clear();
    this.obstacles.clear();
    this.hazards.clear();
    this.particles.clear();
    this.input.reset();

    this._nextWave();
  }

  _nextWave() {
    this.wave++;
    this.score += CONFIG.WAVE_CLEAR_BONUS * (this.wave > 1 ? 1 : 0);

    // Generate obstacles
    this.obstacles.generate(this.wave);

    // Generate shard chains
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

    for (let i = 0; i < numChains; i++) {
      const maxStartX = CONFIG.GAME_WIDTH - chainLength * CONFIG.SHARD_SIZE;
      const startX = 10 + Math.random() * Math.max(0, maxStartX - 20);
      const startY = 30 + i * (CONFIG.SHARD_SIZE + 15);
      const colorIndex = i % 3;
      const hp = this.wave >= 8 && Math.random() < 0.2 ? 2 : 1;

      const chain = ShardChain.create(startX, startY, chainLength, speed, colorIndex, hp);
      this.shards.addChain(chain);
    }

    Audio.enemySpawn();

    // Wave intro
    this.state = STATES.WAVE_INTRO;
    this.ui.announceWave(this.wave);
  }

  _gameOver() {
    this.state = STATES.GAME_OVER;
    Audio.stopMusic();
    Audio.gameOver();

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
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
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
    } catch {
      // localStorage might not be available
    }
  }

  _render() {
    const ctx = this.ctx;
    ctx.save();

    // Apply screen shake
    if (this.shakeTimer > 0) {
      const shakeFactor = this.shakeTimer / CONFIG.SHAKE_DURATION;
      const dx = (Math.random() - 0.5) * this.shakeIntensity * shakeFactor * 2;
      const dy = (Math.random() - 0.5) * this.shakeIntensity * shakeFactor * 2;
      ctx.translate(dx, dy);
    }

    // Background
    this.ui.renderBackground(ctx, this.time);

    if (this.state === STATES.MENU) {
      // Render some ambient particles on menu
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
      this.bullets.render(ctx);
      this.player.render(ctx);
      this.particles.render(ctx);

      // HUD
      this.ui.renderHUD(ctx, this.score, this.highScore, this.player.lives, this.wave, this.comboMultiplier);

      // Wave announcement
      if (this.state === STATES.WAVE_INTRO) {
        this.ui.renderWaveAnnounce(ctx);
      }

      // Pause overlay
      if (this.state === STATES.PAUSED) {
        this.menuButton = this.ui.renderPauseScreen(ctx);
      }

      // Game over overlay
      if (this.state === STATES.GAME_OVER) {
        this.menuButton = this.ui.renderGameOverScreen(
          ctx, this.score, this.highScore, this.isNewHighScore, this.wave, this.time
        );
      }
    }

    ctx.restore();
  }
}
