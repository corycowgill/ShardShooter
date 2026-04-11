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

  update(dt) {
    if (this.waveAnnounceTimer > 0) this.waveAnnounceTimer -= dt;
    if (this.comboDisplayTimer > 0) this.comboDisplayTimer--;
    if (this.milestoneTimer > 0) this.milestoneTimer--;
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

    // Pause button (top right, below lives) - large touch target
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText('| |', CONFIG.GAME_WIDTH - 24, 38);

    ctx.restore();
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

  // Render background grid
  renderBackground(ctx, time) {
    ctx.fillStyle = CONFIG.COLORS.BG;
    ctx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    // Subtle grid
    ctx.strokeStyle = CONFIG.COLORS.GRID;
    ctx.lineWidth = 0.5;
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

    // Danger zone indicator at bottom
    const dangerY = CONFIG.GAME_HEIGHT - CONFIG.PLAYER_Y_OFFSET - 20;
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
