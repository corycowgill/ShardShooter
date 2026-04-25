// Post-processing visual effects — applied after the main render pass
import { CONFIG } from './config.js';

export class PostFX {
  constructor() {
    // Offscreen canvas for bloom
    this._bloomCanvas = null;
    this._bloomCtx = null;
    this._scanlineOffset = 0;
  }

  _ensureBloom(w, h) {
    if (!this._bloomCanvas || this._bloomCanvas.width !== w || this._bloomCanvas.height !== h) {
      this._bloomCanvas = document.createElement('canvas');
      this._bloomCanvas.width = w;
      this._bloomCanvas.height = h;
      this._bloomCtx = this._bloomCanvas.getContext('2d');
    }
  }

  render(ctx, time, shakeActive = false, timeSlow = false) {
    const W = CONFIG.GAME_WIDTH;
    const H = CONFIG.GAME_HEIGHT;

    // --- 1. Simulated bloom pass ---
    // Copy main canvas, downscale, blur, overlay as additive glow
    this._ensureBloom(W, H);
    const bctx = this._bloomCtx;
    // Draw current frame at reduced scale for blur approximation
    bctx.clearRect(0, 0, W, H);
    bctx.globalAlpha = 0.35;
    bctx.filter = 'blur(6px) brightness(1.8)';
    bctx.drawImage(ctx.canvas, 0, 0, W, H);
    bctx.filter = 'none';
    bctx.globalAlpha = 1;

    // Blend bloom back with screen (lighter) blending
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.2;
    ctx.drawImage(this._bloomCanvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // --- 2. Chromatic aberration (subtle on edges, stronger on shake) ---
    const abAmount = shakeActive ? 2.0 : 0.6;
    if (abAmount > 0.3) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      // Red channel shift
      ctx.globalAlpha = 0.04;
      ctx.drawImage(ctx.canvas, -abAmount, 0, W, H);
      // Blue channel shift
      ctx.globalAlpha = 0.04;
      ctx.drawImage(ctx.canvas, abAmount, 0, W, H);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }

    // --- 3. CRT scanlines ---
    this._scanlineOffset = (this._scanlineOffset + 0.5) % 4;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
    const startY = Math.floor(this._scanlineOffset);
    for (let y = startY; y < H; y += 4) {
      ctx.fillRect(0, y, W, 1);
    }
    ctx.restore();

    // --- 4. Film grain (very subtle) ---
    ctx.save();
    ctx.globalAlpha = 0.015;
    for (let i = 0; i < 30; i++) {
      const gx = Math.random() * W;
      const gy = Math.random() * H;
      const gs = 1 + Math.random() * 2;
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(gx, gy, gs, gs);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // --- 5. Time-slow visual distortion ---
    if (timeSlow) {
      // Desaturation overlay (slightly washed-out purple tint)
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#aa66ff';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();

      // Radial distortion lines
      ctx.save();
      ctx.globalAlpha = 0.03 + Math.sin(time * 0.003) * 0.015;
      const distCX = W / 2;
      const distCY = H / 2;
      for (let i = 0; i < 16; i++) {
        const a = (Math.PI * 2 * i) / 16 + time * 0.0005;
        const innerR = H * 0.15;
        const outerR = H * 0.7;
        ctx.strokeStyle = '#aa66ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(distCX + Math.cos(a) * innerR, distCY + Math.sin(a) * innerR);
        ctx.lineTo(distCX + Math.cos(a) * outerR, distCY + Math.sin(a) * outerR);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // Pulsing edge glow
      const slowVigGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.7);
      const slowPulse = 0.06 + Math.sin(time * 0.004) * 0.03;
      slowVigGrad.addColorStop(0, 'transparent');
      slowVigGrad.addColorStop(0.7, `rgba(170, 102, 255, ${slowPulse})`);
      slowVigGrad.addColorStop(1, `rgba(120, 60, 200, ${slowPulse * 2})`);
      ctx.fillStyle = slowVigGrad;
      ctx.fillRect(0, 0, W, H);
    }

    // --- 6. Enhanced vignette (tighter, with color tint) ---
    const vigGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
    vigGrad.addColorStop(0, 'transparent');
    vigGrad.addColorStop(0.7, 'rgba(0, 0, 10, 0.15)');
    vigGrad.addColorStop(1, 'rgba(0, 0, 10, 0.5)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, W, H);
  }
}
