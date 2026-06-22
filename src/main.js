import { Game, STATE } from './game/Game.js';
import { Renderer } from './render/Renderer.js';
import { TouchInput } from './input/TouchInput.js';
import { Storage } from './storage/Storage.js';

// 注册 Service Worker（PWA 离线支持）
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Service Worker 注册失败，不影响游戏运行
  });
}

class App {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.game = new Game();
    this.renderer = new Renderer(this.canvas);
    this.input = new TouchInput(this.game);

    this.startScreen = document.getElementById('start-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.highScoreDisplay = document.getElementById('high-score-display');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalHighScoreEl = document.getElementById('final-high-score');

    this._setupUI();
    this._setupCallbacks();

    // 窗口尺寸变化
    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.renderer.resize(), 300);
    });

    this.renderer.resize();
    this._showStartScreen();

    // 启动游戏循环
    this._loop();
  }

  /** 绑定 UI 事件 */
  _setupUI() {
    document.getElementById('btn-start').addEventListener('click', () => {
      this._startGame();
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      this._startGame();
    });

    // 创建触控按钮
    this.input.createButtons(document.getElementById('app'));
  }

  /** 绑定游戏事件回调 */
  _setupCallbacks() {
    this.game.onStateChange = (state) => {
      if (state === STATE.GAME_OVER) {
        this._showGameOver();
      }
      if (state === STATE.IDLE) {
        this._showStartScreen();
      }
    };

    this.game.onScoreChange = (data) => {
      // Canvas 渲染由主循环处理
    };
  }

  /** 开始游戏 */
  _startGame() {
    this.startScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.game.start();
  }

  /** 显示开始界面 */
  _showStartScreen() {
    this.highScoreDisplay.textContent = Storage.getHighScore();
    this.startScreen.classList.remove('hidden');
    this.gameOverScreen.classList.add('hidden');
  }

  /** 显示结束界面 */
  _showGameOver() {
    const finalScore = this.game.score;
    const isNew = Storage.setHighScore(finalScore);
    this.finalScoreEl.textContent = finalScore;
    this.finalHighScoreEl.textContent = Storage.getHighScore();
    this.gameOverScreen.classList.remove('hidden');
    this.startScreen.classList.add('hidden');
  }

  /** 主循环 */
  _loop() {
    const now = performance.now();
    this.game.update(now);
    this.renderer.render(this.game, now);
    requestAnimationFrame(() => this._loop());
  }
}

// 启动
const app = new App();
