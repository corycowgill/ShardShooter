// Input handling for keyboard, touch, and gamepad
import { CONFIG } from './config.js';

const GAMEPAD_DEADZONE = 0.25;

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
    this.tapAction = null;
    this.pauseAction = null;

    // Gamepad state
    this.gamepad = null;
    this.gpButtons = {};     // current frame pressed state
    this.gpButtonsPrev = {}; // previous frame pressed state
    this.gpAxisX = 0;        // left stick X (-1 to 1)
    this.gpConnected = false;

    this._bindKeyboard();
    this._bindTouch();
    this._bindGamepad();
  }

  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.pauseAction) this.pauseAction();
      }
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

    this.canvas.addEventListener('touchcancel', () => {
      this.touchActive = false;
      this.touchId = null;
    });

    // Mouse support for desktop
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

  _bindGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepad = e.gamepad;
      this.gpConnected = true;
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.gamepad = null;
      this.gpConnected = false;
      this.gpButtons = {};
      this.gpButtonsPrev = {};
      this.gpAxisX = 0;
    });
  }

  // Call once per frame before reading input
  pollGamepad() {
    // Copy current to previous
    this.gpButtonsPrev = { ...this.gpButtons };

    // Navigator.getGamepads() returns a live snapshot
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i] && gamepads[i].connected) {
        gp = gamepads[i];
        break;
      }
    }
    if (!gp) {
      this.gpConnected = false;
      return;
    }

    this.gpConnected = true;
    this.gamepad = gp;

    // Standard mapping (Xbox layout):
    //  0 = A, 1 = B, 2 = X, 3 = Y
    //  4 = LB, 5 = RB, 6 = LT, 7 = RT
    //  8 = Back/View, 9 = Start/Menu
    // 12 = DPad Up, 13 = DPad Down, 14 = DPad Left, 15 = DPad Right
    const buttons = gp.buttons;
    this.gpButtons = {};
    for (let i = 0; i < buttons.length; i++) {
      this.gpButtons[i] = buttons[i].pressed;
    }

    // Left stick X axis (axis 0)
    const rawX = gp.axes[0] || 0;
    this.gpAxisX = Math.abs(rawX) > GAMEPAD_DEADZONE ? rawX : 0;

    // Pause on Start/Menu button (button 9) — only on rising edge
    if (this.gpButtons[9] && !this.gpButtonsPrev[9]) {
      if (this.pauseAction) this.pauseAction();
    }
  }

  // Returns true on the frame a gamepad button is first pressed
  _gpJustPressed(buttonIndex) {
    return this.gpButtons[buttonIndex] && !this.gpButtonsPrev[buttonIndex];
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

  // Movement: returns value from -1 to 1
  getMoveX() {
    let dx = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) dx -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) dx += 1;

    // Gamepad: left stick or D-pad
    if (this.gpAxisX !== 0) dx += this.gpAxisX;
    if (this.gpButtons[14]) dx -= 1; // DPad Left
    if (this.gpButtons[15]) dx += 1; // DPad Right

    return Math.max(-1, Math.min(1, dx));
  }

  isFiring() {
    return this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'] || this.touchActive
      || this.gpButtons[0]   // A
      || this.gpButtons[2]   // X
      || this.gpButtons[5]   // RB
      || this.gpButtons[7];  // RT
  }

  isConfirm() {
    return this.keys['Enter'] || this.keys['Space']
      || this._gpJustPressed(0)  // A
      || this._gpJustPressed(9); // Start
  }

  consumeConfirm() {
    this.keys['Enter'] = false;
    this.keys['Space'] = false;
    // Gamepad buttons are re-polled each frame, so just clearing prev prevents re-trigger
    this.gpButtonsPrev[0] = true;
    this.gpButtonsPrev[9] = true;
  }

  getTouchTargetX() {
    if (!this.touchActive) return null;
    return this.touchX;
  }

  isTapInRect(x, y, w, h) {
    if (!this.touchActive) return false;
    return this.touchX >= x && this.touchX <= x + w &&
           this.touchY >= y && this.touchY <= y + h;
  }

  reset() {
    this.keys = {};
    this.touchActive = false;
    this.touchId = null;
    this.gpButtons = {};
    this.gpButtonsPrev = {};
    this.gpAxisX = 0;
  }
}
