import { COLS, ROWS, HIDDEN_ROWS, SHAPES, COLORS } from '../constants.js';
import { Piece } from './Piece.js';

export class Board {
  constructor() {
    this.grid = [];
    this.reset();
  }

  /** 初始化空棋盘 */
  reset() {
    this.grid = [];
    for (let r = 0; r < ROWS + HIDDEN_ROWS; r++) {
      this.grid.push(new Array(COLS).fill(null));
    }
  }

  /** 检测是否发生碰撞（包含边界检测） */
  checkCollision(type, rotation, col, row) {
    const shape = SHAPES[type][rotation];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (shape[r][c]) {
          const boardCol = col + c;
          const boardRow = row + r;
          // 超出左右/下边界
          if (boardCol < 0 || boardCol >= COLS || boardRow >= ROWS + HIDDEN_ROWS) {
            return true;
          }
          // 超出上边界不算碰撞（允许在上方生成）
          if (boardRow < 0) continue;
          // 与已有方块碰撞
          if (this.grid[boardRow][boardCol] !== null) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /** 将方块固定到棋盘 */
  lockPiece(piece) {
    const cells = piece.getCells();
    for (const { col, row } of cells) {
      if (row >= 0 && row < ROWS + HIDDEN_ROWS && col >= 0 && col < COLS) {
        this.grid[row][col] = piece.type;
      }
    }
  }

  /** 消除满行，返回消除的行数和消除的行索引 */
  clearLines() {
    const clearedRows = [];
    for (let r = 0; r < ROWS + HIDDEN_ROWS; r++) {
      if (this.grid[r].every(cell => cell !== null)) {
        clearedRows.push(r);
      }
    }

    // 从下往上移除行
    for (const row of clearedRows.sort((a, b) => b - a)) {
      this.grid.splice(row, 1);
      this.grid.unshift(new Array(COLS).fill(null));
    }

    return clearedRows.length;
  }

  /** 检测游戏是否结束（方块超出可见区域顶部） */
  isTopOut() {
    for (let c = 0; c < COLS; c++) {
      if (this.grid[HIDDEN_ROWS][c] !== null) {
        return true;
      }
    }
    return false;
  }

  /** 获取可见区域的网格（不含隐藏行） */
  getVisibleGrid() {
    return this.grid.slice(HIDDEN_ROWS);
  }
}
