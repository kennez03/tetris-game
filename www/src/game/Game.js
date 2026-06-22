import { Board } from './Board.js';
import { Piece } from './Piece.js';
import {
  PIECE_TYPES, SCORE_TABLE,
  SOFT_DROP_SCORE, HARD_DROP_SCORE,
  getDropInterval, LINES_PER_LEVEL
} from '../constants.js';

export const STATE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
};

export class Game {
  constructor() {
    this.board = new Board();
    this.state = STATE.IDLE;
    this.currentPiece = null;
    this.nextPiece = null;
    this.holdPiece = null;
    this.canHold = true;
    this.score = 0;
    this.level = 0;
    this.lines = 0;
    this.combo = -1;
    this.bag = [];
    this.dropTimer = 0;
    this.lastDropTime = 0;
    this.onStateChange = null;   // 回调：状态变化时通知 UI
    this.onScoreChange = null;   // 回调：分数变化时通知 UI
  }

  /** 初始化新游戏 */
  start() {
    this.board.reset();
    this.score = 0;
    this.level = 0;
    this.lines = 0;
    this.combo = -1;
    this.bag = [];
    this.holdPiece = null;
    this.canHold = true;
    this.lastDropTime = performance.now();

    this.nextPiece = this._popFromBag();
    this._spawnPiece();
    this.state = STATE.PLAYING;

    this._notifyStateChange();
    this._notifyScoreChange();
  }

  /** 更新逻辑（每帧调用） */
  update(now) {
    if (this.state !== STATE.PLAYING) return;

    const interval = this._getDropInterval();
    if (now - this.lastDropTime >= interval) {
      this.lastDropTime = now;
      if (!this.currentPiece.moveDown(this.board)) {
        this._lockPiece();
      }
    }
  }

  /** ─── 玩家操作 ─── */

  moveLeft() {
    if (this.state !== STATE.PLAYING || !this.currentPiece) return;
    this.currentPiece.move(this.board, -1);
  }

  moveRight() {
    if (this.state !== STATE.PLAYING || !this.currentPiece) return;
    this.currentPiece.move(this.board, 1);
  }

  rotate() {
    if (this.state !== STATE.PLAYING || !this.currentPiece) return;
    this.currentPiece.rotate(this.board, 1);
  }

  rotateReverse() {
    if (this.state !== STATE.PLAYING || !this.currentPiece) return;
    this.currentPiece.rotate(this.board, -1);
  }

  softDrop() {
    if (this.state !== STATE.PLAYING || !this.currentPiece) return;
    if (this.currentPiece.moveDown(this.board)) {
      this.score += SOFT_DROP_SCORE;
      this.lastDropTime = performance.now(); // 重置自动下落计时
      this._notifyScoreChange();
    }
  }

  hardDrop() {
    if (this.state !== STATE.PLAYING || !this.currentPiece) return;
    const distance = this.currentPiece.hardDrop(this.board);
    this.score += distance * HARD_DROP_SCORE;
    this._lockPiece();
  }

  hold() {
    if (this.state !== STATE.PLAYING || !this.currentPiece || !this.canHold) return;

    const currentType = this.currentPiece.type;
    if (this.holdPiece) {
      // 交换
      const holdType = this.holdPiece;
      this.holdPiece = currentType;
      this._spawnSpecific(holdType);
    } else {
      this.holdPiece = currentType;
      this._spawnPiece();
    }
    this.canHold = false;
    this._notifyStateChange();
  }

  pause() {
    if (this.state === STATE.PLAYING) {
      this.state = STATE.PAUSED;
      this._notifyStateChange();
    } else if (this.state === STATE.PAUSED) {
      this.state = STATE.PLAYING;
      this.lastDropTime = performance.now();
      this._notifyStateChange();
    }
  }

  /** ─── 内部方法 ─── */

  _spawnPiece() {
    this.currentPiece = new Piece(this.nextPiece.type);
    this.currentPiece.col = 3;
    this.currentPiece.row = 0;
    this.nextPiece = this._popFromBag();
    this.canHold = true;

    // 检测游戏结束
    if (this.board.checkCollision(this.currentPiece.type, this.currentPiece.rotation, this.currentPiece.col, this.currentPiece.row)) {
      this.state = STATE.GAME_OVER;
      this._notifyStateChange();
    }
  }

  _spawnSpecific(type) {
    this.currentPiece = new Piece(type);
    this.currentPiece.col = 3;
    this.currentPiece.row = 0;
    this.canHold = true;

    if (this.board.checkCollision(this.currentPiece.type, this.currentPiece.rotation, this.currentPiece.col, this.currentPiece.row)) {
      this.state = STATE.GAME_OVER;
      this._notifyStateChange();
    }
  }

  _lockPiece() {
    if (!this.currentPiece) return;

    this.board.lockPiece(this.currentPiece);

    // 消除行
    const cleared = this.board.clearLines();
    if (cleared > 0) {
      this.combo++;
      const comboBonus = this.combo > 0 ? this.combo * 50 : 0;
      this.lines += cleared;
      this.score += (SCORE_TABLE[cleared] || 0) * (this.level + 1) + comboBonus;
      this.level = Math.floor(this.lines / LINES_PER_LEVEL);
      this._notifyScoreChange();
    } else {
      this.combo = -1;
    }

    // 检测顶部溢出
    if (this.board.isTopOut()) {
      this.state = STATE.GAME_OVER;
      this._notifyStateChange();
      return;
    }

    // 生成下一个方块
    this._spawnPiece();
  }

  _popFromBag() {
    if (this.bag.length === 0) {
      // 7-bag 随机：将 7 种方块洗牌放入袋子
      this.bag = [...PIECE_TYPES];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return { type: this.bag.pop() };
  }

  _getDropInterval() {
    return getDropInterval(this.level);
  }

  _notifyStateChange() {
    if (this.onStateChange) this.onStateChange(this.state);
  }

  _notifyScoreChange() {
    if (this.onScoreChange) this.onScoreChange({
      score: this.score,
      level: this.level,
      lines: this.lines,
      holdPiece: this.holdPiece,
      nextPiece: this.nextPiece?.type,
      combo: Math.max(0, this.combo),
    });
  }
}
