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
    this.displayScore = 0; // animated rolling score counter
  }

  announceWave(wave, isBoss = false) {
    if (wave === 0) {
      this.waveAnnounceText = 'GET READY';
    } else if (isBoss) {
      this.waveAnnounceText = `BOSS WAVE ${wave}`;
    } else {
      this.waveAnnounceText = `WAVE ${wave}`;
    }
    this.waveAnnounceIsBoss = isBoss;
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

  renderHUD(ctx, score, highScore, lives, wave, combo, dashInfo = null) {
    ctx.save();
    const W = CONFIG.GAME_WIDTH;

    // Animated rolling score counter
    if (this.displayScore < score) {
      this.displayScore += Math.ceil((score - this.displayScore) * 0.15);
      if (this.displayScore > score) this.displayScore = score;
    }

    // --- HUD top bar background ---
    const barGrad = ctx.createLinearGradient(0, 0, 0, 42);
    barGrad.addColorStop(0, 'rgba(0, 0, 20, 0.5)');
    barGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, W, 42);

    // Top border line
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, 42);
    ctx.lineTo(W, 42);
    ctx.stroke();

    // Score - top left with glow
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = C.UI_SCORE;
    ctx.shadowColor = C.UI_SCORE;
    ctx.shadowBlur = 6;
    ctx.fillText(`${this.displayScore}`, 10, 8);
    ctx.shadowBlur = 0;
    // Score label
    ctx.font = '8px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 224, 51, 0.6)';
    ctx.fillText('SCORE', 10, 26);

    // High score
    ctx.font = '9px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillText(`HI ${highScore}`, 10, 35);

    // Wave - top center with decorative brackets
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = C.UI_TEXT;
    ctx.fillText(`\u25C0 WAVE ${wave} \u25B6`, W / 2, 8);
    // Decorative line under wave
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 45, 22);
    ctx.lineTo(W / 2 + 45, 22);
    ctx.stroke();

    // Combo fire meter (below wave)
    if (combo > 1) {
      const meterW = 70;
      const meterH = 4;
      const meterX = W / 2 - meterW / 2;
      const meterY = 25;
      const fill = Math.min(1, (combo - 1) / 4);

      // Meter background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(meterX, meterY, meterW, meterH);

      // Meter fill — color shifts from yellow to red at high combo
      const meterGrad = ctx.createLinearGradient(meterX, 0, meterX + meterW, 0);
      meterGrad.addColorStop(0, '#ffe033');
      meterGrad.addColorStop(0.5, '#ff8800');
      meterGrad.addColorStop(1, '#ff2244');
      ctx.fillStyle = meterGrad;
      ctx.fillRect(meterX, meterY, meterW * fill, meterH);

      // Meter border
      ctx.strokeStyle = 'rgba(255, 224, 51, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(meterX, meterY, meterW, meterH);

      // Combo text
      ctx.font = '7px "Courier New", monospace';
      ctx.fillStyle = `rgba(255, 224, 51, 0.7)`;
      ctx.fillText(`x${combo.toFixed(1)}`, W / 2, meterY + meterH + 7);
    }

    // Lives - top right — miniature ship icons with detail
    for (let i = 0; i < lives; i++) {
      const lx = W - 14 - i * 18;
      const ly = 14;

      ctx.save();
      ctx.translate(lx, ly);

      // Glow
      ctx.shadowColor = C.UI_LIVES;
      ctx.shadowBlur = 4;

      // Miniature ship hull
      ctx.fillStyle = C.UI_LIVES;
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5, 3);
      ctx.lineTo(3, 4);
      ctx.lineTo(0, 2);
      ctx.lineTo(-3, 4);
      ctx.lineTo(-5, 3);
      ctx.closePath();
      ctx.fill();

      // Cockpit
      ctx.fillStyle = '#005577';
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(1.5, 0);
      ctx.lineTo(0, 1);
      ctx.lineTo(-1.5, 0);
      ctx.closePath();
      ctx.fill();

      // Nose dot
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(0, -4.5, 0.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Lives label
    ctx.textAlign = 'right';
    ctx.font = '7px "Courier New", monospace';
    ctx.fillStyle = 'rgba(0, 229, 255, 0.5)';
    ctx.textBaseline = 'top';
    ctx.fillText('LIVES', W - 8, 24);

    // Combo display (large, center)
    if (this.comboDisplayTimer > 0 && combo > 1) {
      const alpha = Math.min(1, this.comboDisplayTimer / 20);
      const scale = 1 + (1 - alpha) * 0.3;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(W / 2, 55);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillText(this.comboDisplayText, 1, 1);
      ctx.fillStyle = C.UI_SCORE;
      ctx.shadowColor = C.UI_SCORE;
      ctx.shadowBlur = 8;
      ctx.fillText(this.comboDisplayText, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Milestone display
    if (this.milestoneTimer > 0) {
      const alpha = Math.min(1, this.milestoneTimer / 30);
      const scale = 1 + (1 - alpha) * 0.2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(W / 2, 75);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = C.UI_SCORE;
      ctx.shadowBlur = 12;
      ctx.fillText(this.milestoneText, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Power-up pickup notification
    if (this.powerupNotifyTimer > 0) {
      const alpha = Math.min(1, this.powerupNotifyTimer / 30);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Notification bar background
      const notifW = 140;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.4})`;
      ctx.fillRect(W / 2 - notifW / 2, 85, notifW, 18);
      ctx.strokeStyle = this.powerupNotifyColor + '44';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(W / 2 - notifW / 2, 85, notifW, 18);

      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillStyle = this.powerupNotifyColor;
      ctx.shadowColor = this.powerupNotifyColor;
      ctx.shadowBlur = 6;
      ctx.fillText(this.powerupNotifyText, W / 2, 94);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Dash cooldown indicator — bottom-left corner
    if (dashInfo) {
      const dx = 12;
      const dy = CONFIG.GAME_HEIGHT - 32;
      const dw = 54;
      const dh = 6;
      const ready = dashInfo.ready;
      const pct = ready ? 1 : Math.max(0, Math.min(1, dashInfo.pct || 0));
      // Label
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 8px "Courier New", monospace';
      ctx.fillStyle = ready ? 'rgba(0, 229, 255, 0.9)' : 'rgba(0, 229, 255, 0.35)';
      ctx.shadowColor = ready ? '#00e5ff' : 'transparent';
      ctx.shadowBlur = ready ? 4 : 0;
      ctx.fillText(ready ? 'DASH READY' : 'DASH', dx, dy - 10);
      ctx.shadowBlur = 0;
      // Bar background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(dx, dy, dw, dh);
      // Bar fill
      const fillColor = ready ? '#00e5ff' : '#446688';
      ctx.fillStyle = fillColor;
      ctx.fillRect(dx, dy, dw * pct, dh);
      // Bar border
      ctx.strokeStyle = ready ? 'rgba(0, 229, 255, 0.8)' : 'rgba(0, 229, 255, 0.25)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(dx, dy, dw, dh);
      // Pulse when ready
      if (ready) {
        const pulse = 0.4 + Math.sin(Date.now() * 0.008) * 0.3;
        ctx.strokeStyle = `rgba(0, 229, 255, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(dx - 1, dy - 1, dw + 2, dh + 2);
      }
    }

    // Pause button — stylized icon
    const pauseAlpha = 0.3;
    ctx.fillStyle = `rgba(255, 255, 255, ${pauseAlpha})`;
    ctx.fillRect(W - 30, 33, 3, 10);
    ctx.fillRect(W - 24, 33, 3, 10);

    ctx.restore();
  }

  // Render floating score texts in game world — with scale-in effect
  renderFloatingTexts(ctx) {
    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      // Scale-in: quick pop then settle
      const ageRatio = 1 - alpha;
      const scale = ageRatio < 0.15 ? 0.5 + ageRatio / 0.15 * 0.7 : 1.2 - ageRatio * 0.3;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(scale, scale);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 12px "Courier New", monospace';
      // Text shadow (darker)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillText(ft.text, 1, 1);
      // Main text with glow
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 6;
      ctx.fillText(ft.text, 0, 0);
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
      time_slow: '#aa66ff',
      pierce: '#00ff88',
    };
    const LABELS = {
      rapid_fire: 'RAPID',
      spread_shot: 'SPREAD',
      shield: 'SHIELD',
      time_slow: 'SLOW',
      pierce: 'PIERCE',
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

  // Active power-up visual overlays — colored edge tints
  renderPowerupOverlays(ctx, activeEffects) {
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const EDGE_W = 20;

    const overlays = {
      rapid_fire: { color: [255, 68, 68], intensity: 0.06 },
      spread_shot: { color: [68, 170, 255], intensity: 0.05 },
      shield: { color: [0, 229, 255], intensity: 0.07 },
      time_slow: { color: [170, 102, 255], intensity: 0.07 },
      pierce: { color: [0, 255, 136], intensity: 0.05 },
    };

    for (const type of Object.keys(activeEffects)) {
      const ov = overlays[type];
      if (!ov) continue;
      const remaining = activeEffects[type];
      const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
      const alpha = ov.intensity * pulse * Math.min(1, remaining / 1000);
      const [r, g, b] = ov.color;

      // Left edge
      const leftGrad = ctx.createLinearGradient(0, 0, EDGE_W, 0);
      leftGrad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      leftGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = leftGrad;
      ctx.fillRect(0, 0, EDGE_W, H);

      // Right edge
      const rightGrad = ctx.createLinearGradient(W, 0, W - EDGE_W, 0);
      rightGrad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      rightGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = rightGrad;
      ctx.fillRect(W - EDGE_W, 0, EDGE_W, H);

      // Top edge
      const topGrad = ctx.createLinearGradient(0, 0, 0, EDGE_W * 0.7);
      topGrad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.5})`);
      topGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, EDGE_W * 0.7);

      // Bottom edge
      const botGrad = ctx.createLinearGradient(0, H, 0, H - EDGE_W * 0.7);
      botGrad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.5})`);
      botGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, H - EDGE_W * 0.7, W, EDGE_W * 0.7);
    }
  }

  renderWaveAnnounce(ctx) {
    if (this.waveAnnounceTimer <= 0) return;

    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;
    const progress = 1 - (this.waveAnnounceTimer / CONFIG.WAVE_INTRO_TIME);
    let alpha;
    if (progress < 0.2) alpha = progress / 0.2;
    else if (progress > 0.7) alpha = (1 - progress) / 0.3;
    else alpha = 1;

    // Scale effect — zoom in then settle
    const scale = progress < 0.15 ? 1.5 - progress / 0.15 * 0.5 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(W / 2, H / 2 - 20);
    ctx.scale(scale, scale);

    // Background bar
    ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.06})`;
    ctx.fillRect(-W * 0.4, -22, W * 0.8, 44);
    ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.15})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-W * 0.4, -22); ctx.lineTo(W * 0.4, -22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-W * 0.4, 22); ctx.lineTo(W * 0.4, 22);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const isBoss = this.waveAnnounceIsBoss;
    const textColor = isBoss ? C.UI_DANGER : C.UI_TITLE_SECONDARY;
    ctx.font = isBoss ? 'bold 30px "Courier New", monospace' : 'bold 36px "Courier New", monospace';
    // Glow layer
    ctx.shadowColor = textColor;
    ctx.shadowBlur = 25;
    ctx.fillStyle = textColor + '55';
    ctx.fillText(this.waveAnnounceText, 0, 0);
    // Main text
    ctx.shadowBlur = 15;
    ctx.fillStyle = textColor;
    ctx.fillText(this.waveAnnounceText, 0, 0);
    ctx.shadowBlur = 0;

    // Boss warning bars
    if (isBoss) {
      ctx.strokeStyle = C.UI_DANGER;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha * 0.8;
      for (let i = 0; i < 4; i++) {
        const bx = -W * 0.4 + i * 18;
        ctx.beginPath();
        ctx.moveTo(bx, -34);
        ctx.lineTo(bx + 12, -34);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(W * 0.4 - bx - 12, 34);
        ctx.lineTo(W * 0.4 - bx, 34);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  renderMenuScreen(ctx, highScore, time) {
    ctx.save();
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    // Background overlay with gradient
    const overlayGrad = ctx.createLinearGradient(0, 0, 0, H);
    overlayGrad.addColorStop(0, 'rgba(5, 5, 20, 0.9)');
    overlayGrad.addColorStop(0.5, 'rgba(10, 10, 26, 0.85)');
    overlayGrad.addColorStop(1, 'rgba(8, 5, 25, 0.9)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, W, H);

    // Animated scan lines on menu
    ctx.fillStyle = 'rgba(255, 255, 255, 0.012)';
    for (let y = 0; y < H; y += 3) {
      if ((y + Math.floor(time * 0.03)) % 6 < 3) {
        ctx.fillRect(0, y, W, 1);
      }
    }

    // Decorative horizontal lines
    const lineAlpha = 0.08 + Math.sin(time * 0.002) * 0.04;
    ctx.strokeStyle = `rgba(224, 64, 251, ${lineAlpha})`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.1, H * 0.22);
    ctx.lineTo(W * 0.9, H * 0.22);
    ctx.stroke();
    ctx.strokeStyle = `rgba(0, 229, 255, ${lineAlpha})`;
    ctx.beginPath();
    ctx.moveTo(W * 0.1, H * 0.45);
    ctx.lineTo(W * 0.9, H * 0.45);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title with gradient fill and layered glow
    const glowPulse = 0.6 + Math.sin(time * 0.003) * 0.4;

    // "SHARD" — multi-layer glow
    ctx.font = 'bold 48px "Courier New", monospace';
    const shardY = H * 0.28;
    // Background glow layer
    ctx.shadowColor = C.UI_TITLE_PRIMARY;
    ctx.shadowBlur = 30 * glowPulse;
    ctx.fillStyle = C.UI_TITLE_PRIMARY + '44';
    ctx.fillText('SHARD', W / 2, shardY);
    // Main text
    ctx.shadowBlur = 20 * glowPulse;
    ctx.fillStyle = C.UI_TITLE_PRIMARY;
    ctx.fillText('SHARD', W / 2, shardY);
    // Highlight top stroke
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.8;
    ctx.strokeText('SHARD', W / 2, shardY);

    // "RUSH" — multi-layer glow
    const rushY = H * 0.36;
    ctx.shadowColor = C.UI_TITLE_SECONDARY;
    ctx.shadowBlur = 30 * glowPulse;
    ctx.fillStyle = C.UI_TITLE_SECONDARY + '44';
    ctx.fillText('RUSH', W / 2, rushY);
    ctx.shadowBlur = 20 * glowPulse;
    ctx.fillStyle = C.UI_TITLE_SECONDARY;
    ctx.fillText('RUSH', W / 2, rushY);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeText('RUSH', W / 2, rushY);

    // Subtitle with tracking
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.letterSpacing = '3px';
    ctx.fillText('B R E A K   T H E   C H A I N S', W / 2, H * 0.42);

    // Play button — gradient border with inner glow
    const btnY = H * 0.54;
    const btnW = 170;
    const btnH = 46;
    const btnX = W / 2 - btnW / 2;
    const pulse = 0.7 + Math.sin(time * 0.005) * 0.3;

    // Button background fill
    ctx.fillStyle = `rgba(0, 229, 255, ${0.04 + pulse * 0.03})`;
    ctx.fillRect(btnX, btnY, btnW, btnH);

    // Button border with glow
    ctx.strokeStyle = C.UI_TITLE_SECONDARY;
    ctx.shadowColor = C.UI_TITLE_SECONDARY;
    ctx.shadowBlur = 10 * pulse;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    // Corner accents
    const cornerLen = 8;
    ctx.lineWidth = 2.5;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(btnX, btnY + cornerLen);
    ctx.lineTo(btnX, btnY);
    ctx.lineTo(btnX + cornerLen, btnY);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(btnX + btnW - cornerLen, btnY);
    ctx.lineTo(btnX + btnW, btnY);
    ctx.lineTo(btnX + btnW, btnY + cornerLen);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(btnX, btnY + btnH - cornerLen);
    ctx.lineTo(btnX, btnY + btnH);
    ctx.lineTo(btnX + cornerLen, btnY + btnH);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(btnX + btnW - cornerLen, btnY + btnH);
    ctx.lineTo(btnX + btnW, btnY + btnH);
    ctx.lineTo(btnX + btnW, btnY + btnH - cornerLen);
    ctx.stroke();

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = C.UI_TITLE_SECONDARY;
    ctx.fillText('PLAY', W / 2, btnY + btnH / 2);
    ctx.shadowBlur = 0;

    // High score with decorative bar
    if (highScore > 0) {
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = C.UI_SCORE;
      ctx.shadowColor = C.UI_SCORE;
      ctx.shadowBlur = 4;
      ctx.fillText(`HIGH SCORE: ${highScore}`, W / 2, H * 0.66);
      ctx.shadowBlur = 0;
      // Underline
      ctx.strokeStyle = C.UI_SCORE + '44';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(W * 0.3, H * 0.68);
      ctx.lineTo(W * 0.7, H * 0.68);
      ctx.stroke();
    }

    // Controls info
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const isMobile = 'ontouchstart' in window;
    if (isMobile) {
      ctx.fillText('TOUCH & DRAG TO MOVE', W / 2, H * 0.76);
      ctx.fillText('AUTO-FIRE ENABLED', W / 2, H * 0.80);
    } else {
      ctx.fillText('\u2190 \u2192 / A D / GAMEPAD TO MOVE', W / 2, H * 0.76);
      ctx.fillText('AUTO-FIRE \u2022 P / START TO PAUSE', W / 2, H * 0.80);
    }

    ctx.font = '10px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillText('DESTROY SHARD CHAINS \u2022 SPLIT THEM APART', W / 2, H * 0.88);
    ctx.fillText('GAMEPAD SUPPORTED', W / 2, H * 0.92);

    ctx.restore();

    return { x: btnX, y: btnY, width: btnW, height: btnH };
  }

  renderPauseScreen(ctx, stats = null) {
    ctx.save();
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.fillStyle = C.UI_TEXT;
    ctx.shadowColor = C.UI_TITLE_SECONDARY;
    ctx.shadowBlur = 10;
    ctx.fillText('PAUSED', W / 2, H / 2 - 100);
    ctx.shadowBlur = 0;

    // Stats panel
    if (stats) {
      const panelW = 220;
      const panelH = 110;
      const panelX = W / 2 - panelW / 2;
      const panelY = H / 2 - 60;

      ctx.fillStyle = 'rgba(0, 20, 40, 0.6)';
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(panelX, panelY, panelW, panelH);

      // Corner accents
      ctx.strokeStyle = C.UI_TITLE_SECONDARY;
      ctx.lineWidth = 2;
      const ac = 8;
      ctx.beginPath();
      ctx.moveTo(panelX, panelY + ac); ctx.lineTo(panelX, panelY); ctx.lineTo(panelX + ac, panelY);
      ctx.moveTo(panelX + panelW - ac, panelY); ctx.lineTo(panelX + panelW, panelY); ctx.lineTo(panelX + panelW, panelY + ac);
      ctx.moveTo(panelX, panelY + panelH - ac); ctx.lineTo(panelX, panelY + panelH); ctx.lineTo(panelX + ac, panelY + panelH);
      ctx.moveTo(panelX + panelW - ac, panelY + panelH); ctx.lineTo(panelX + panelW, panelY + panelH); ctx.lineTo(panelX + panelW, panelY + panelH - ac);
      ctx.stroke();

      ctx.font = '11px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'left';
      ctx.fillText('WAVE', panelX + 14, panelY + 20);
      ctx.fillText('SCORE', panelX + 14, panelY + 42);
      ctx.fillText('SHARDS', panelX + 14, panelY + 64);
      ctx.fillText('COMBO', panelX + 14, panelY + 86);

      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillStyle = C.UI_TITLE_SECONDARY;
      ctx.textAlign = 'right';
      ctx.fillText(`${stats.wave}`, panelX + panelW - 14, panelY + 20);
      ctx.fillStyle = C.UI_SCORE;
      ctx.fillText(`${stats.score}`, panelX + panelW - 14, panelY + 42);
      ctx.fillStyle = C.UI_TEXT;
      ctx.fillText(`${stats.shards}`, panelX + panelW - 14, panelY + 64);
      ctx.fillStyle = stats.combo > 1 ? C.UI_SCORE : 'rgba(255,255,255,0.5)';
      ctx.fillText(`x${stats.combo.toFixed(1)}`, panelX + panelW - 14, panelY + 86);
      ctx.textAlign = 'center';
    }

    // Resume button
    const btnW = 160;
    const btnH = 44;
    const btnX = W / 2 - btnW / 2;
    const btnY = H / 2 + 80;

    ctx.strokeStyle = C.UI_TITLE_SECONDARY;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = C.UI_TITLE_SECONDARY;
    ctx.fillText('RESUME', W / 2, btnY + btnH / 2);

    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('P OR ESC TO RESUME', W / 2, btnY + btnH + 20);

    ctx.restore();

    return { x: btnX, y: btnY, width: btnW, height: btnH };
  }

  renderGameOverScreen(ctx, score, highScore, isNewHighScore, wave, time) {
    ctx.save();
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    // Darkened overlay with red tint
    const goGrad = ctx.createLinearGradient(0, 0, 0, H);
    goGrad.addColorStop(0, 'rgba(15, 5, 10, 0.92)');
    goGrad.addColorStop(0.5, 'rgba(10, 10, 26, 0.9)');
    goGrad.addColorStop(1, 'rgba(15, 5, 10, 0.92)');
    ctx.fillStyle = goGrad;
    ctx.fillRect(0, 0, W, H);

    // Scan lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.008)';
    for (let y = 0; y < H; y += 3) {
      if ((y + Math.floor(time * 0.02)) % 6 < 3) {
        ctx.fillRect(0, y, W, 1);
      }
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Game Over title — double glow layer
    ctx.font = 'bold 40px "Courier New", monospace';
    ctx.shadowColor = C.UI_DANGER;
    ctx.shadowBlur = 25;
    ctx.fillStyle = C.UI_DANGER + '55';
    ctx.fillText('GAME OVER', W / 2, H * 0.25);
    ctx.shadowBlur = 15;
    ctx.fillStyle = C.UI_DANGER;
    ctx.fillText('GAME OVER', W / 2, H * 0.25);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.6;
    ctx.strokeText('GAME OVER', W / 2, H * 0.25);

    // Decorative line
    ctx.strokeStyle = `rgba(255, 23, 68, 0.15)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(W * 0.15, H * 0.30);
    ctx.lineTo(W * 0.85, H * 0.30);
    ctx.stroke();

    // Score
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillStyle = C.UI_SCORE;
    ctx.shadowColor = C.UI_SCORE;
    ctx.shadowBlur = 6;
    ctx.fillText(`SCORE: ${score}`, W / 2, H * 0.38);
    ctx.shadowBlur = 0;

    // Wave reached
    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = C.UI_TEXT;
    ctx.fillText(`WAVE ${wave} REACHED`, W / 2, H * 0.44);

    // New high score — animated
    if (isNewHighScore) {
      const glow = 0.5 + Math.sin(time * 0.005) * 0.5;
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillStyle = C.UI_SCORE;
      ctx.shadowColor = C.UI_SCORE;
      ctx.shadowBlur = 12 * glow;
      ctx.fillText('NEW HIGH SCORE!', W / 2, H * 0.50);
      ctx.shadowBlur = 0;
      // Decorative stars
      const starSpread = 90;
      for (let i = 0; i < 3; i++) {
        const sx = W / 2 - starSpread + i * starSpread;
        const sy = H * 0.50 + Math.sin(time * 0.004 + i) * 3;
        ctx.fillStyle = `rgba(255, 224, 51, ${0.3 + glow * 0.3})`;
        ctx.font = '10px "Courier New", monospace';
        ctx.fillText('\u2605', sx, sy);
      }
    } else {
      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(`HIGH SCORE: ${highScore}`, W / 2, H * 0.50);
    }

    // Restart button — same style as menu
    const btnW = 170;
    const btnH = 46;
    const btnX = W / 2 - btnW / 2;
    const btnY = H * 0.60;

    const pulse = 0.7 + Math.sin(time * 0.005) * 0.3;

    ctx.fillStyle = `rgba(0, 229, 255, ${0.04 + pulse * 0.03})`;
    ctx.fillRect(btnX, btnY, btnW, btnH);

    ctx.strokeStyle = C.UI_TITLE_SECONDARY;
    ctx.shadowColor = C.UI_TITLE_SECONDARY;
    ctx.shadowBlur = 10 * pulse;
    ctx.lineWidth = 2;
    ctx.strokeRect(btnX, btnY, btnW, btnH);

    // Corner accents
    const cornerLen = 8;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(btnX, btnY + cornerLen); ctx.lineTo(btnX, btnY); ctx.lineTo(btnX + cornerLen, btnY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(btnX + btnW - cornerLen, btnY); ctx.lineTo(btnX + btnW, btnY); ctx.lineTo(btnX + btnW, btnY + cornerLen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(btnX, btnY + btnH - cornerLen); ctx.lineTo(btnX, btnY + btnH); ctx.lineTo(btnX + cornerLen, btnY + btnH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(btnX + btnW - cornerLen, btnY + btnH); ctx.lineTo(btnX + btnW, btnY + btnH); ctx.lineTo(btnX + btnW, btnY + btnH - cornerLen);
    ctx.stroke();

    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = C.UI_TITLE_SECONDARY;
    ctx.fillText('RETRY', W / 2, btnY + btnH / 2);
    ctx.shadowBlur = 0;

    ctx.restore();

    return { x: btnX, y: btnY, width: btnW, height: btnH };
  }

  // Pre-generate starfield once — 3 parallax layers
  _initStars() {
    if (this._stars) return;
    this._starLayers = [[], [], []];
    const layerCounts = [50, 40, 25];
    const layerSpeeds = [0.08, 0.2, 0.45];
    const layerSizes = [[0.2, 0.6], [0.4, 1.0], [0.8, 1.8]];
    const layerBright = [[0.15, 0.35], [0.25, 0.55], [0.4, 0.8]];
    for (let l = 0; l < 3; l++) {
      for (let i = 0; i < layerCounts[l]; i++) {
        const [sMin, sMax] = layerSizes[l];
        const [bMin, bMax] = layerBright[l];
        this._starLayers[l].push({
          x: Math.random() * CONFIG.GAME_WIDTH,
          y: Math.random() * CONFIG.GAME_HEIGHT,
          size: sMin + Math.random() * (sMax - sMin),
          brightness: bMin + Math.random() * (bMax - bMin),
          twinkleSpeed: 0.002 + Math.random() * 0.004,
          twinkleOffset: Math.random() * Math.PI * 2,
          speed: layerSpeeds[l],
          // Random color tint: mostly white/blue, occasionally warm
          hue: Math.random() < 0.15 ? 30 + Math.random() * 20 : 210 + Math.random() * 40,
        });
      }
    }
    this._stars = true;
    // Shooting star pool
    this._shootingStars = [];
    this._shootingStarTimer = 0;
  }

  renderBackground(ctx, time) {
    this._initStars();
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    // Dark background with richer vertical gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#030312');
    bgGrad.addColorStop(0.3, '#06061a');
    bgGrad.addColorStop(0.6, CONFIG.COLORS.BG);
    bgGrad.addColorStop(1, '#0a0618');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Animated nebula washes — 3 drifting clouds
    const nebulas = [
      { cx: 0.2, cy: 0.25, r: 200, color: [100, 0, 200], freq: 0.0003, amp: 35 },
      { cx: 0.8, cy: 0.55, r: 160, color: [0, 80, 150], freq: 0.0004, amp: 30 },
      { cx: 0.5, cy: 0.8, r: 140, color: [150, 0, 80], freq: 0.00035, amp: 25 },
    ];
    for (const n of nebulas) {
      const alpha = 0.025 + Math.sin(time * 0.0005 + n.cx * 10) * 0.012;
      const ox = Math.sin(time * n.freq) * n.amp;
      const oy = Math.cos(time * n.freq * 0.7 + 1) * n.amp * 0.5;
      const grad = ctx.createRadialGradient(
        W * n.cx + ox, H * n.cy + oy, 0,
        W * n.cx, H * n.cy, n.r
      );
      grad.addColorStop(0, `rgba(${n.color[0]},${n.color[1]},${n.color[2]},${alpha})`);
      grad.addColorStop(0.6, `rgba(${n.color[0]},${n.color[1]},${n.color[2]},${alpha * 0.3})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    // --- Distant celestial body (planet/moon) ---
    if (!this._planet) {
      this._planet = {
        x: W * (0.15 + Math.random() * 0.2),
        y: H * (0.1 + Math.random() * 0.15),
        r: 25 + Math.random() * 15,
        hue: Math.floor(Math.random() * 360),
        hasRing: Math.random() > 0.5,
      };
      // Space dust particles (tiny fixed specks)
      this._spaceDust = [];
      for (let i = 0; i < 40; i++) {
        this._spaceDust.push({
          x: Math.random() * W,
          y: Math.random() * H,
          size: 0.2 + Math.random() * 0.4,
          speed: 0.03 + Math.random() * 0.06,
          alpha: 0.05 + Math.random() * 0.1,
        });
      }
    }

    // Render planet
    const p = this._planet;
    const pDrift = Math.sin(time * 0.0001) * 3;
    const px = p.x + pDrift;
    const py = p.y;

    // Planet atmosphere glow
    const atmGrad = ctx.createRadialGradient(px, py, p.r * 0.8, px, py, p.r * 2.2);
    atmGrad.addColorStop(0, `hsla(${p.hue}, 50%, 40%, 0.04)`);
    atmGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = atmGrad;
    ctx.beginPath();
    ctx.arc(px, py, p.r * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Planet body
    const pbGrad = ctx.createRadialGradient(px - p.r * 0.3, py - p.r * 0.3, 0, px, py, p.r);
    pbGrad.addColorStop(0, `hsla(${p.hue}, 30%, 30%, 0.15)`);
    pbGrad.addColorStop(0.6, `hsla(${p.hue}, 40%, 20%, 0.12)`);
    pbGrad.addColorStop(1, `hsla(${p.hue}, 50%, 10%, 0.08)`);
    ctx.fillStyle = pbGrad;
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fill();

    // Planet surface bands
    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = `hsla(${p.hue}, 20%, 40%, 0.04)`;
    ctx.lineWidth = 1;
    for (let b = -3; b <= 3; b++) {
      ctx.beginPath();
      ctx.ellipse(px, py + b * p.r * 0.25, p.r, p.r * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Planet terminator (shadow edge)
    const termGrad = ctx.createLinearGradient(px - p.r, py, px + p.r, py);
    termGrad.addColorStop(0, 'transparent');
    termGrad.addColorStop(0.6, 'transparent');
    termGrad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
    ctx.fillStyle = termGrad;
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = `hsla(${p.hue}, 20%, 80%, 0.06)`;
    ctx.beginPath();
    ctx.arc(px - p.r * 0.35, py - p.r * 0.35, p.r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Ring (if present)
    if (p.hasRing) {
      ctx.strokeStyle = `hsla(${p.hue}, 30%, 50%, 0.06)`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(px, py, p.r * 1.8, p.r * 0.3, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `hsla(${p.hue}, 30%, 60%, 0.04)`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(px, py, p.r * 2.1, p.r * 0.35, 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Space dust — drifting micro-particles
    for (const d of this._spaceDust) {
      d.y += d.speed;
      if (d.y > H + 1) { d.y = -1; d.x = Math.random() * W; }
      ctx.fillStyle = `rgba(180, 200, 220, ${d.alpha})`;
      ctx.fillRect(d.x, d.y, d.size, d.size);
    }

    // Parallax star layers — back-to-front
    for (let l = 0; l < 3; l++) {
      for (const star of this._starLayers[l]) {
        // Slow vertical drift for parallax feel
        star.y += star.speed * 0.15;
        if (star.y > H + 2) { star.y = -2; star.x = Math.random() * W; }

        const twinkle = star.brightness * (0.5 + Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.5);
        if (twinkle < 0.05) continue;

        // Color-tinted stars
        const satStr = l === 2 ? '40%' : '20%';
        ctx.fillStyle = `hsla(${star.hue}, ${satStr}, ${70 + l * 10}%, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Cross-glint on foreground bright stars
        if (l === 2 && star.size > 1.2) {
          const glintAlpha = twinkle * 0.35;
          ctx.strokeStyle = `hsla(${star.hue}, 30%, 85%, ${glintAlpha})`;
          ctx.lineWidth = 0.4;
          const gs = star.size * 3;
          ctx.beginPath();
          ctx.moveTo(star.x - gs, star.y);
          ctx.lineTo(star.x + gs, star.y);
          ctx.moveTo(star.x, star.y - gs);
          ctx.lineTo(star.x, star.y + gs);
          ctx.stroke();
          // Diagonal glint
          ctx.globalAlpha = glintAlpha * 0.4;
          ctx.beginPath();
          ctx.moveTo(star.x - gs * 0.6, star.y - gs * 0.6);
          ctx.lineTo(star.x + gs * 0.6, star.y + gs * 0.6);
          ctx.moveTo(star.x + gs * 0.6, star.y - gs * 0.6);
          ctx.lineTo(star.x - gs * 0.6, star.y + gs * 0.6);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    // Shooting stars — occasional bright streaks
    this._shootingStarTimer -= 16;
    if (this._shootingStarTimer <= 0 && this._shootingStars.length < 2) {
      this._shootingStarTimer = 3000 + Math.random() * 6000;
      const startX = Math.random() * W;
      const angle = 0.3 + Math.random() * 0.5;
      this._shootingStars.push({
        x: startX, y: -5,
        vx: Math.cos(angle) * (4 + Math.random() * 3) * (Math.random() < 0.5 ? 1 : -1),
        vy: Math.sin(angle) * (4 + Math.random() * 3),
        life: 30 + Math.random() * 25,
        maxLife: 0,
        size: 1 + Math.random() * 1.5,
        hue: Math.random() < 0.3 ? 40 : 210,
      });
      this._shootingStars[this._shootingStars.length - 1].maxLife =
        this._shootingStars[this._shootingStars.length - 1].life;
    }
    for (const ss of this._shootingStars) {
      ss.x += ss.vx;
      ss.y += ss.vy;
      ss.life--;
      const alpha = ss.life / ss.maxLife;
      const tailLen = 12 + ss.size * 5;
      ctx.save();
      const grad = ctx.createLinearGradient(
        ss.x, ss.y, ss.x - ss.vx * tailLen * 0.3, ss.y - ss.vy * tailLen * 0.3
      );
      grad.addColorStop(0, `hsla(${ss.hue}, 60%, 90%, ${alpha * 0.9})`);
      grad.addColorStop(1, 'transparent');
      ctx.strokeStyle = grad;
      ctx.lineWidth = ss.size;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * tailLen * 0.3, ss.y - ss.vy * tailLen * 0.3);
      ctx.stroke();
      // Bright head
      ctx.fillStyle = `hsla(${ss.hue}, 40%, 95%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(ss.x, ss.y, ss.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this._shootingStars = this._shootingStars.filter(s => s.life > 0 && s.y < H + 10);

    // Grid overlay — perspective-style fading
    ctx.strokeStyle = CONFIG.COLORS.GRID;
    const gridSize = 40;
    for (let x = 0; x <= W; x += gridSize) {
      const edgeDist = Math.min(x, W - x) / (W * 0.5);
      ctx.lineWidth = 0.3 + edgeDist * 0.2;
      ctx.globalAlpha = 0.4 + edgeDist * 0.3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y <= H; y += gridSize) {
      const edgeDist = Math.min(y, H - y) / (H * 0.5);
      ctx.lineWidth = 0.3 + edgeDist * 0.2;
      ctx.globalAlpha = 0.4 + edgeDist * 0.3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Grid intersection dots with subtle pulse
    const dotPulse = 0.4 + Math.sin(time * 0.001) * 0.15;
    ctx.fillStyle = `rgba(50, 50, 100, ${dotPulse})`;
    for (let x = 0; x <= W; x += gridSize) {
      for (let y = 0; y <= H; y += gridSize) {
        ctx.beginPath();
        ctx.arc(x, y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Side border glow — animated color cycling
    const borderHue = 190 + Math.sin(time * 0.001) * 15;
    const sideAlpha = 0.05 + Math.sin(time * 0.002) * 0.02;
    const sideGrad = ctx.createLinearGradient(0, 0, 18, 0);
    sideGrad.addColorStop(0, `hsla(${borderHue}, 100%, 55%, ${sideAlpha})`);
    sideGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sideGrad;
    ctx.fillRect(0, 0, 18, H);

    const sideGrad2 = ctx.createLinearGradient(W, 0, W - 18, 0);
    sideGrad2.addColorStop(0, `hsla(${borderHue}, 100%, 55%, ${sideAlpha})`);
    sideGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = sideGrad2;
    ctx.fillRect(W - 18, 0, 18, H);

    // Danger zone — animated pulse
    const dangerY = H - CONFIG.PLAYER_Y_OFFSET - 20;
    const dangerPulse = 0.08 + Math.sin(time * 0.003) * 0.04;
    const dangerGrad = ctx.createLinearGradient(0, dangerY - 8, 0, dangerY + 8);
    dangerGrad.addColorStop(0, 'transparent');
    dangerGrad.addColorStop(0.5, `rgba(255, 23, 68, ${dangerPulse})`);
    dangerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = dangerGrad;
    ctx.fillRect(0, dangerY - 8, W, 16);

    ctx.strokeStyle = `rgba(255, 23, 68, ${dangerPulse * 0.8})`;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 10]);
    ctx.lineDashOffset = -time * 0.02;
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(W, dangerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vignette — darkened corners/edges
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
    vigGrad.addColorStop(0, 'transparent');
    vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);
  }

  // Check if a touch/click hit the pause button area
  isPauseButtonHit(x, y) {
    return x >= CONFIG.GAME_WIDTH - 55 && y <= 55;
  }
}
