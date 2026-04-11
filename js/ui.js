// UI rendering - HUD, menus, screens
import { CONFIG } from './config.js';

const C = CONFIG.COLORS;

export class UI {
  constructor() {
    this.waveAnnounceTimer = 0;
    this.waveAnnounceText = '';
    this.comboDisplayTimer = 0;
    this.comboDisplayText = '';
    this.milestoneTimer = 0;
    this.milestoneText = '';
    this.floatingTexts = [];
    this.screenFlash = 0;
    this.screenFlashColor = '#ffffff';
    this.powerupNotifyTimer = 0;
    this.powerupNotifyText = '';
    this.powerupNotifyColor = '#ffffff';
    this.muted = false;
  }

  announceWave(wave) {
    this.waveAnnounceText = wave === 0 ? 'GET READY' : `WAVE ${wave}`;
    this.waveAnnounceTimer = CONFIG.WAVE_INTRO_TIME;
  }

  showCombo(multiplier) {
    this.comboDisplayText = `x${multiplier.toFixed(1)} COMBO`;
    this.comboDisplayTimer = 60;
  }

  showMilestone(score) {
    this.milestoneText = `${score} POINTS!`;
    this.milestoneTimer = 90;
  }

  addFloatingText(x, y, text, color = C.UI_SCORE) {
    this.floatingTexts.push({
      x, y, text, color,
      life: 45,
      maxLife: 45,
      vy: -1.5,
    });
  }

  flash(color = '#ffffff', intensity = 0.3) {
    this.screenFlash = intensity;
    this.screenFlashColor = color;
  }

  showPowerupNotify(text, color) {
    this.powerupNotifyText = text;
    this.powerupNotifyColor = color;
    this.powerupNotifyTimer = 90;
  }

  update(dt) {
    if (this.waveAnnounceTimer > 0) this.waveAnnounceTimer -= dt;
    if (this.comboDisplayTimer > 0) this.comboDisplayTimer--;
    if (this.milestoneTimer > 0) this.milestoneTimer--;
    if (this.powerupNotifyTimer > 0) this.powerupNotifyTimer--;
    if (this.screenFlash > 0) this.screenFlash *= 0.85;

    for (const ft of this.floatingTexts) {
      ft.y += ft.vy;
      ft.vy *= 0.97;
      ft.life--;
    }
    this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
  }

  renderHUD(ctx, score, highScore, lives, wave, combo) {
    ctx.save();

    // Score - top left
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = C.UI_SCORE;
    ctx.shadowColor = C.UI_SCORE;
    ctx.shadowBlur = 4;
    ctx.fillText(`SCORE ${score}`, 10, 10);
    ctx.shadowBlur = 0;

    // High score
    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(`HI ${highScore}`, 10, 30);

    // Wave - top center
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = C.UI_TEXT;
    ctx.fillText(`WAVE ${wave}`, CONFIG.GAME_WIDTH / 2, 10);

    // Lives - top right
    ctx.textAlign = 'right';
    for (let i = 0; i < lives; i++) {
      const lx = CONFIG.GAME_WIDTH - 14 - i * 20;
      const ly = 14;
      ctx.fillStyle = C.UI_LIVES;
      ctx.shadowColor = C.UI_LIVES;
      ctx.shadowBlur = 4;
      // Small ship icon
      ctx.beginPath();
      ctx.moveTo(lx, ly - 6);
      ctx.lineTo(lx + 6, ly + 4);
      ctx.lineTo(lx - 6, ly + 4);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Combo display
    if (this.comboDisplayTimer > 0 && combo > 1) {
      const alpha = Math.min(1, this.comboDisplayTimer / 20);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillStyle = C.UI_SCORE;
      ctx.shadowColor = C.UI_SCORE;
      ctx.shadowBlur = 6;
      ctx.fillText(this.comboDisplayText, CONFIG.GAME_WIDTH / 2, 50);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Milestone display
    if (this.milestoneTimer > 0) {
      const alpha = Math.min(1, this.milestoneTimer / 30);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = C.UI_SCORE;
      ctx.shadowBlur = 10;
      ctx.fillText(this.milestoneText, CONFIG.GAME_WIDTH / 2, 70);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Power-up pickup notification
    if (this.powerupNotifyTimer > 0) {
      const alpha = Math.min(1, this.powerupNotifyTimer / 30);
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.fillStyle = this.powerupNotifyColor;
      ctx.shadowColor = this.powerupNotifyColor;
      ctx.shadowBlur = 8;
      ctx.fillText(this.powerupNotifyText, CONFIG.GAME_WIDTH / 2, 90);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    // Pause button (top right, below lives) - large touch target
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText('| |', CONFIG.GAME_WIDTH - 24, 38);

    ctx.restore();
  }

  // Render floating score texts in game world
  renderFloatingTexts(ctx) {
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  // Render active power-up timers bar at bottom of HUD
  renderPowerupTimers(ctx, activeEffects) {
    const types = Object.keys(activeEffects);
    if (types.length === 0) return;

    ctx.save();
    const barY = CONFIG.GAME_HEIGHT - 18;
    const barH = 12;
    const gap = 4;
    const totalW = types.length * 60 + (types.length - 1) * gap;
    let startX = (CONFIG.GAME_WIDTH - totalW) / 2;

    const COLORS = {
      rapid_fire: '#ff4444',
      spread_shot: '#44aaff',
      shield: '#00e5ff',
    };
    const LABELS = {
      rapid_fire: 'RAPID',
      spread_shot: 'SPREAD',
      shield: 'SHIELD',
    };

    for (const type of types) {
      const color = COLORS[type] || '#ffffff';
      const label = LABELS[type] || type;

      // Bar background
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(startX, barY, 60, barH);

      // Bar fill (visual timer, assume max 7000ms)
      const pct = Math.min(1, activeEffects[type] / 7000);
      ctx.fillStyle = color + '88';
      ctx.fillRect(startX, barY, 60 * pct, barH);

      // Border
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, barY, 60, barH);

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, startX + 30, barY + barH / 2);

      startX += 60 + gap;
    }

    ctx.restore();
  }

  // Full-screen flash overlay
  renderScreenFlash(ctx) {
    if (this.screenFlash > 0.01) {
      ctx.save();
      ctx.globalAlpha = this.screenFlash;
      ctx.fillStyle = this.screenFlashColor;
      ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  renderWaveAnnounce(ctx) {
    if (this.waveAnnounceTimer <= 0) return;

    const progress = 1 - (this.waveAnnounceTimer / CONFIG.WAVE_INTRO_TIME);
    let alpha;
    if (progress < 0.2) alpha = progress / 0.2;
    else if (progress > 0.7) alpha = (1 - progress) / 0.3;
    else alpha = 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.fillStyle = C.UI_TITLE_SECONDARY;
    ctx.shadowColor = C.UI_TITLE_SECONDARY;
    ctx.shadowBlur = 20;
    ctx.fillText(this.waveAnnounceText, CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  renderMenuScreen(ctx, highScore, time) {
    ctx.save();

    // Background overlay
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    // Title
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title glow
    const glowPulse = 0.6 + Math.sin(time * 0.003) * 0.4;

    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.shadowColor = C.UI_TITLE_PRIMARY;
    ctx.shadowBlur = 20 * glowPulse;
    ctx.fillStyle = C.UI_TITLE_PRIMARY;
    ctx.fillText('SHARD', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.28);

    ctx.shadowColor = C.UI_TITLE_SECONDARY;
    ctx.fillStyle = C.UI_TITLE_SECONDARY;
    ctx.fillText('RUSH', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.36);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('BREAK THE CHAINS', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.42);

    // Play button
    const btnY = CONFIG.GAME_HEIGHT * 0.54;
    const btnW = 160;
    const btnH = 44;
    const btnX = CONFIG.GAME_WIDTH / 2 - btnW / 2;

    const pulse = 0.7 + Math.sin(time * 0.005) * 0.3;
    ctx.strokeStyle = C.UI_TITLE_SECONDARY;
    ctx.shadowColor = C.UI_TITLE_SECONDARY;
    ctx.shadowBlur = 8 * pulse;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = C.UI_TITLE_SECONDARY;
    ctx.fillText('PLAY', CONFIG.GAME_WIDTH / 2, btnY + btnH / 2);
    ctx.shadowBlur = 0;

    // High score
    if (highScore > 0) {
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = C.UI_SCORE;
      ctx.fillText(`HIGH SCORE: ${highScore}`, CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.66);
    }

    // Controls info
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const isMobile = 'ontouchstart' in window;
    if (isMobile) {
      ctx.fillText('TOUCH & DRAG TO MOVE', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.76);
      ctx.fillText('AUTO-FIRE ENABLED', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.80);
    } else {
      ctx.fillText('\u2190 \u2192 / A D / GAMEPAD TO MOVE', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.76);
      ctx.fillText('AUTO-FIRE \u2022 P / START TO PAUSE', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.80);
    }

    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillText('DESTROY SHARD CHAINS \u2022 SPLIT THEM APART', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.88);
    ctx.fillText('GAMEPAD SUPPORTED', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.92);

    ctx.restore();

    // Return button bounds for click detection
    return { x: btnX, y: btnY, width: btnW, height: btnH };
  }

  renderPauseScreen(ctx) {
    ctx.save();

    ctx.fillStyle = 'rgba(10, 10, 26, 0.8)';
    ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.fillStyle = C.UI_TEXT;
    ctx.shadowColor = C.UI_TITLE_SECONDARY;
    ctx.shadowBlur = 10;
    ctx.fillText('PAUSED', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 30);
    ctx.shadowBlur = 0;

    // Resume button
    const btnW = 160;
    const btnH = 44;
    const btnX = CONFIG.GAME_WIDTH / 2 - btnW / 2;
    const btnY = CONFIG.GAME_HEIGHT / 2 + 20;

    ctx.strokeStyle = C.UI_TITLE_SECONDARY;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = C.UI_TITLE_SECONDARY;
    ctx.fillText('RESUME', CONFIG.GAME_WIDTH / 2, btnY + btnH / 2);

    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('P OR ESC TO RESUME', CONFIG.GAME_WIDTH / 2, btnY + btnH + 30);

    ctx.restore();

    return { x: btnX, y: btnY, width: btnW, height: btnH };
  }

  renderGameOverScreen(ctx, score, highScore, isNewHighScore, wave, time) {
    ctx.save();

    ctx.fillStyle = 'rgba(10, 10, 26, 0.9)';
    ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Game Over title
    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.fillStyle = C.UI_DANGER;
    ctx.shadowColor = C.UI_DANGER;
    ctx.shadowBlur = 15;
    ctx.fillText('GAME OVER', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.25);
    ctx.shadowBlur = 0;

    // Score
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = C.UI_SCORE;
    ctx.fillText(`SCORE: ${score}`, CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.38);

    // Wave reached
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = C.UI_TEXT;
    ctx.fillText(`WAVE ${wave} REACHED`, CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.44);

    // New high score
    if (isNewHighScore) {
      const glow = 0.5 + Math.sin(time * 0.005) * 0.5;
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillStyle = C.UI_SCORE;
      ctx.shadowColor = C.UI_SCORE;
      ctx.shadowBlur = 10 * glow;
      ctx.fillText('NEW HIGH SCORE!', CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.50);
      ctx.shadowBlur = 0;
    } else {
      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(`HIGH SCORE: ${highScore}`, CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT * 0.50);
    }

    // Restart button
    const btnW = 160;
    const btnH = 44;
    const btnX = CONFIG.GAME_WIDTH / 2 - btnW / 2;
    const btnY = CONFIG.GAME_HEIGHT * 0.60;

    const pulse = 0.7 + Math.sin(time * 0.005) * 0.3;
    ctx.strokeStyle = C.UI_TITLE_SECONDARY;
    ctx.shadowColor = C.UI_TITLE_SECONDARY;
    ctx.shadowBlur = 8 * pulse;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = C.UI_TITLE_SECONDARY;
    ctx.fillText('RETRY', CONFIG.GAME_WIDTH / 2, btnY + btnH / 2);
    ctx.shadowBlur = 0;

    ctx.restore();

    return { x: btnX, y: btnY, width: btnW, height: btnH };
  }

  // Pre-generate starfield once
  _initStars() {
    if (this._stars) return;
    this._stars = [];
    for (let i = 0; i < 80; i++) {
      this._stars.push({
        x: Math.random() * CONFIG.GAME_WIDTH,
        y: Math.random() * CONFIG.GAME_HEIGHT,
        size: 0.3 + Math.random() * 1.2,
        brightness: 0.2 + Math.random() * 0.6,
        twinkleSpeed: 0.002 + Math.random() * 0.004,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  renderBackground(ctx, time) {
    this._initStars();

    // Dark background with subtle vertical gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CONFIG.GAME_HEIGHT);
    bgGrad.addColorStop(0, '#06061a');
    bgGrad.addColorStop(0.4, CONFIG.COLORS.BG);
    bgGrad.addColorStop(1, '#0c0820');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    // Nebula-like color washes
    const nebulaAlpha = 0.03 + Math.sin(time * 0.0005) * 0.01;
    const neb1 = ctx.createRadialGradient(
      CONFIG.GAME_WIDTH * 0.2 + Math.sin(time * 0.0003) * 30,
      CONFIG.GAME_HEIGHT * 0.3,
      0,
      CONFIG.GAME_WIDTH * 0.2, CONFIG.GAME_HEIGHT * 0.3, 180
    );
    neb1.addColorStop(0, `rgba(100, 0, 200, ${nebulaAlpha})`);
    neb1.addColorStop(1, 'transparent');
    ctx.fillStyle = neb1;
    ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    const neb2 = ctx.createRadialGradient(
      CONFIG.GAME_WIDTH * 0.8 + Math.sin(time * 0.0004 + 2) * 25,
      CONFIG.GAME_HEIGHT * 0.6,
      0,
      CONFIG.GAME_WIDTH * 0.8, CONFIG.GAME_HEIGHT * 0.6, 150
    );
    neb2.addColorStop(0, `rgba(0, 80, 150, ${nebulaAlpha})`);
    neb2.addColorStop(1, 'transparent');
    ctx.fillStyle = neb2;
    ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    // Stars with twinkling
    for (const star of this._stars) {
      const twinkle = star.brightness * (0.6 + Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.4);
      ctx.fillStyle = `rgba(200, 220, 255, ${twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      // Subtle cross-shaped glint on brighter stars
      if (star.size > 0.8) {
        ctx.strokeStyle = `rgba(200, 220, 255, ${twinkle * 0.3})`;
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(star.x - star.size * 2, star.y);
        ctx.lineTo(star.x + star.size * 2, star.y);
        ctx.moveTo(star.x, star.y - star.size * 2);
        ctx.lineTo(star.x, star.y + star.size * 2);
        ctx.stroke();
      }
    }

    // Grid overlay
    ctx.strokeStyle = CONFIG.COLORS.GRID;
    ctx.lineWidth = 0.4;
    const gridSize = 40;
    for (let x = 0; x < CONFIG.GAME_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CONFIG.GAME_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CONFIG.GAME_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CONFIG.GAME_WIDTH, y);
      ctx.stroke();
    }

    // Grid intersection dots
    ctx.fillStyle = 'rgba(40, 40, 80, 0.5)';
    for (let x = 0; x < CONFIG.GAME_WIDTH; x += gridSize) {
      for (let y = 0; y < CONFIG.GAME_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Side border glow
    const sideGrad = ctx.createLinearGradient(0, 0, 12, 0);
    sideGrad.addColorStop(0, 'rgba(0, 229, 255, 0.06)');
    sideGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sideGrad;
    ctx.fillRect(0, 0, 12, CONFIG.GAME_HEIGHT);

    const sideGrad2 = ctx.createLinearGradient(CONFIG.GAME_WIDTH, 0, CONFIG.GAME_WIDTH - 12, 0);
    sideGrad2.addColorStop(0, 'rgba(0, 229, 255, 0.06)');
    sideGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = sideGrad2;
    ctx.fillRect(CONFIG.GAME_WIDTH - 12, 0, 12, CONFIG.GAME_HEIGHT);

    // Danger zone line with gradient fade
    const dangerY = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_Y_OFFSET - 20;
    const dangerGrad = ctx.createLinearGradient(0, dangerY - 6, 0, dangerY + 6);
    dangerGrad.addColorStop(0, 'transparent');
    dangerGrad.addColorStop(0.5, 'rgba(255, 23, 68, 0.12)');
    dangerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = dangerGrad;
    ctx.fillRect(0, dangerY - 6, CONFIG.GAME_WIDTH, 12);

    ctx.strokeStyle = 'rgba(255, 23, 68, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(CONFIG.GAME_WIDTH, dangerY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Check if a touch/click hit the pause button area
  isPauseButtonHit(x, y) {
    return x >= CONFIG.GAME_WIDTH - 55 && y <= 55;
  }
}
