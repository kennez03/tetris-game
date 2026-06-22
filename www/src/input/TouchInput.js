/**
 * 触控输入系统 — 支持手势 + 虚拟按钮
 *
 * 手势:
 *   - 左/右滑: 左右移动
 *   - 下滑: 软降
 *   - 上滑: 硬降
 *   - 点击: 旋转
 *   - 长按: Hold
 *
 * 虚拟按钮（底部面板，兼容无触控设备）
 *   - ◀ ▶ 左右移动
 *   - ↻ 旋转
 *   - ↓ 软降
 *   - ⬇ 硬降
 *   - H  Hold
 */
export class TouchInput {
  constructor(game) {
    this.game = game;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.isTouching = false;
    this.longPressTimer = null;
    this.longPressTriggered = false;
    this.repeatTimers = {};   // 长按重复触发
    this.repeatDelay = 170;   // 初始延迟
    this.repeatRate = 50;     // 重复间隔

    // 手势灵敏度
    this.swipeThreshold = 20;   // 最少滑动像素
    this.longPressDuration = 400; // 长按触发时间(ms)

    this._bindEvents();
  }

  _bindEvents() {
    // 手势事件
    document.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });

    // 键盘支持（开发调试用）
    document.addEventListener('keydown', this._onKeyDown.bind(this));
  }

  /** 创建虚拟按钮（由外部调用） */
  createButtons(container) {
    const layout = [
      { label: '◀', action: 'moveLeft', hold: true },
      { label: '↻', action: 'rotate', hold: false },
      { label: '▶', action: 'moveRight', hold: true },
      { label: '⬇', action: 'softDrop', hold: true },
      { label: '⤓', action: 'hardDrop', hold: false },
      { label: 'H', action: 'hold', hold: false },
    ];

    const panel = document.createElement('div');
    panel.id = 'touch-panel';
    panel.className = 'touch-panel';

    layout.forEach(({ label, action, hold }) => {
      const btn = document.createElement('button');
      btn.className = 'touch-btn';
      btn.textContent = label;
      btn.dataset.action = action;

      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this._executeAction(action);
        if (hold) {
          this._startRepeat(action);
        }
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this._stopRepeat(action);
      }, { passive: false });

      btn.addEventListener('touchcancel', (e) => {
        this._stopRepeat(action);
      });

      // 鼠标兼容
      btn.addEventListener('mousedown', () => {
        this._executeAction(action);
        if (hold) this._startRepeat(action);
      });
      btn.addEventListener('mouseup', () => this._stopRepeat(action));
      btn.addEventListener('mouseleave', () => this._stopRepeat(action));

      panel.appendChild(btn);
    });

    container.appendChild(panel);
    this.panel = panel;
  }

  /** ─── 触摸事件处理 ─── */

  _onTouchStart(e) {
    // 忽略虚拟按钮上的触摸
    if (e.target.closest('.touch-panel')) return;
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.isTouching = true;
    this.longPressTriggered = false;

    this.longPressTimer = setTimeout(() => {
      if (this.isTouching) {
        this.longPressTriggered = true;
        this._executeAction('hold');
      }
    }, this.longPressDuration);
  }

  _onTouchMove(e) {
    if (!this.isTouching || e.target.closest('.touch-panel')) return;
    const touch = e.touches[0];
    const dx = touch.clientX - this.touchStartX;
    const dy = touch.clientY - this.touchStartY;

    // 仅在超过阈值时触发一次方向滑动
    if (Math.abs(dx) > this.swipeThreshold || Math.abs(dy) > this.swipeThreshold) {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        // 水平滑动
        if (dx > 0) {
          this._executeAction('moveRight');
        } else {
          this._executeAction('moveLeft');
        }
      } else {
        // 垂直滑动
        if (dy > 0) {
          this._executeAction('softDrop');
        } else {
          this._executeAction('hardDrop');
        }
      }

      // 重置起点，允许连续滑动
      this.touchStartX = touch.clientX;
      this.touchStartY = touch.clientY;
    }
  }

  _onTouchEnd(e) {
    if (e.target.closest('.touch-panel')) return;
    this.isTouching = false;
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    // 没有触发滑动也没有长按 → 视为点击 = 旋转
    const dt = Date.now() - this.touchStartTime;
    const touch = e.changedTouches[0];
    if (touch) {
      const dx = Math.abs(touch.clientX - this.touchStartX);
      const dy = Math.abs(touch.clientY - this.touchStartY);
      if (dx < this.swipeThreshold && dy < this.swipeThreshold && dt < this.longPressDuration) {
        this._executeAction('rotate');
      }
    }
  }

  /** ─── 键盘支持 ─── */
  _onKeyDown(e) {
    const keyMap = {
      ArrowLeft: 'moveLeft',
      ArrowRight: 'moveRight',
      ArrowUp: 'rotate',
      ArrowDown: 'softDrop',
      ' ': 'hardDrop',
      c: 'hold',
      p: 'pause',
      r: 'rotate',
    };

    const action = keyMap[e.key];
    if (action) {
      e.preventDefault();
      this._executeAction(action);
    }
  }

  /** ─── 执行动作 ─── */
  _executeAction(action) {
    switch (action) {
      case 'moveLeft': this.game.moveLeft(); break;
      case 'moveRight': this.game.moveRight(); break;
      case 'rotate': this.game.rotate(); break;
      case 'softDrop': this.game.softDrop(); break;
      case 'hardDrop': this.game.hardDrop(); break;
      case 'hold': this.game.hold(); break;
      case 'pause': this.game.pause(); break;
    }
  }

  /** ─── 长按重复 ─── */
  _startRepeat(action) {
    this._stopRepeat(action);
    this.repeatTimers[action] = setTimeout(() => {
      const interval = setInterval(() => {
        this._executeAction(action);
      }, this.repeatRate);
      this.repeatTimers[action] = interval;
    }, this.repeatDelay);
  }

  _stopRepeat(action) {
    if (this.repeatTimers[action]) {
      clearTimeout(this.repeatTimers[action]);
      clearInterval(this.repeatTimers[action]);
      delete this.repeatTimers[action];
    }
  }
}
