import { PIECE_TYPES, SHAPES, COLORS, getKicks } from '../constants.js';

export class Piece {
  constructor(type) {
    this.type = type;
    this.rotation = 0;   // 0, 1, 2, 3
    this.col = 3;        // 起始列（左侧偏移）
    this.row = 0;        // 起始行（在隐藏区域）
  }

  /** 获取当前旋转状态的形状矩阵 */
  getShape() {
    return SHAPES[this.type][this.rotation];
  }

  /** 获取组成方块的单元格坐标列表 [{col, row}] */
  getCells() {
    const shape = this.getShape();
    const cells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (shape[r][c]) {
          cells.push({ col: this.col + c, row: this.row + r });
        }
      }
    }
    return cells;
  }

  /** 获取指定位置/旋转下的单元格 */
  static getCellsAt(type, rotation, col, row) {
    const shape = SHAPES[type][rotation];
    const cells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (shape[r][c]) {
          cells.push({ col: col + c, row: row + r });
        }
      }
    }
    return cells;
  }

  /** 尝试旋转，返回是否成功 */
  rotate(board, direction = 1) {
    const newRot = ((this.rotation + direction) % 4 + 4) % 4;
    const kicks = getKicks(this.type, this.rotation, newRot);

    for (const [kickCol, kickRow] of kicks) {
      const testCol = this.col + kickCol;
      const testRow = this.row + kickRow;
      if (!board.checkCollision(this.type, newRot, testCol, testRow)) {
        this.col = testCol;
        this.row = testRow;
        this.rotation = newRot;
        return true;
      }
    }
    return false;
  }

  /** 尝试左右移动 */
  move(board, dCol) {
    if (!board.checkCollision(this.type, this.rotation, this.col + dCol, this.row)) {
      this.col += dCol;
      return true;
    }
    return false;
  }

  /** 尝试向下移动，返回是否成功 */
  moveDown(board) {
    if (!board.checkCollision(this.type, this.rotation, this.col, this.row + 1)) {
      this.row += 1;
      return true;
    }
    return false;
  }

  /** 硬降到底 */
  hardDrop(board) {
    let distance = 0;
    while (!board.checkCollision(this.type, this.rotation, this.col, this.row + 1)) {
      this.row += 1;
      distance++;
    }
    return distance;
  }

  /** 获取 ghost piece 的行位置 */
  getGhostRow(board) {
    let ghostRow = this.row;
    while (!board.checkCollision(this.type, this.rotation, this.col, ghostRow + 1)) {
      ghostRow++;
    }
    return ghostRow;
  }

  /** 随机生成下一个方块 */
  static random() {
    const type = PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
    return new Piece(type);
  }
}
