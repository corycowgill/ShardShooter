// Input handling for keyboard and touch
import { CONFIG } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.touchActive = false;
    this.touchX = 0;
    this.touchY = 0;
    this.touchStartX = 0;
    this.touchId = null;
    this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.tapAction = null; // callback for taps (menu clicks)
    this.pauseAction = null;

    this._bindKeyboard();
    this._bindTouch();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.pauseAction) this.pauseAction();
      }
      // Prevent scrolling with arrow keys / space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  _bindTouch() {
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.touchActive = true;
      this.touchId = touch.identifier;
      const pos = this._getTouchPos(touch);
      this.touchX = pos.x;
      this.touchY = pos.y;
      this.touchStartX = pos.x;
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.touchId) {
          const pos = this._getTouchPos(touch);
          this.touchX = pos.x;
          this.touchY = pos.y;
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.touchId) {
          this.touchActive = false;
          this.touchId = null;
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchcancel', (e) => {
      this.touchActive = false;
      this.touchId = null;
    });

    // Mouse support for desktop testing
    this.canvas.addEventListener('mousedown', (e) => {
      const pos = this._getMousePos(e);
      this.touchActive = true;
      this.touchX = pos.x;
      this.touchY = pos.y;
      this.touchStartX = pos.x;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (this.touchActive) {
        const pos = this._getMousePos(e);
        this.touchX = pos.x;
        this.touchY = pos.y;
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      this.touchActive = false;
    });
  }

  _getTouchPos(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (CONFIG.GAME_WIDTH / rect.width),
      y: (touch.clientY - rect.top) * (CONFIG.GAME_HEIGHT / rect.height),
    };
  }

  _getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CONFIG.GAME_WIDTH / rect.width),
      y: (e.clientY - rect.top) * (CONFIG.GAME_HEIGHT / rect.height),
    };
  }

  // Movement intent: returns value from -1 to 1
  getMoveX() {
    let dx = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1;
    return dx;
  }

  isFiring() {
    return this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'] || this.touchActive;
  }

  isConfirm() {
    return this.keys['Enter'] || this.keys['Space'];
  }

  consumeConfirm() {
    this.keys['Enter'] = false;
    this.keys['Space'] = false;
  }

  getTouchTargetX() {
    if (!this.touchActive) return null;
    return this.touchX;
  }

  // Check if touch/click is within a rectangle (game coordinates)
  isTapInRect(x, y, w, h) {
    if (!this.touchActive) return false;
    return this.touchX >= x && this.touchX <= x + w &&
           this.touchY >= y && this.touchY <= y + h;
  }

  reset() {
    this.keys = {};
    this.touchActive = false;
    this.touchId = null;
  }
}
