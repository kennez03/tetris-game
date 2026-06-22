import { COLS, ROWS, HIDDEN_ROWS, COLORS, SHAPES } from '../constants.js';
import { STATE } from '../game/Game.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = 30;
    this.boardX = 0;
    this.boardY = 0;
    this.boardPixelWidth = 0;
    this.boardPixelHeight = 0;
    this.scale = 1;
    this.animFrame = 0;
    this.lineClearAnim = []; // 正在播放消除动画的行
    this.lastTime = 0;
  }

  /** 根据屏幕尺寸计算布局 */
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.scale = dpr;
    this._calculateLayout(w, h);
  }

  /** 计算游戏板布局 */
  _calculateLayout(w, h) {
    // 给操作按钮留底部空间，顶部留状态显示
    const topMargin = h * 0.02;
    const bottomMargin = h * 0.26;
    const sideMargin = w * 0.02;

    const availableW = w - sideMargin * 2;
    const availableH = h - topMargin - bottomMargin;

    // 根据 available 空间计算 cellSize（同时考虑边栏宽度）
    const sidePanelCells = 5; // 边栏宽度（cell 为单位）
    const totalCols = COLS + sidePanelCells * 2; // 棋盘 + 左右边栏
    const cellFromW = availableW / totalCols;
    const cellFromH = availableH / ROWS;

    this.cellSize = Math.floor(Math.min(cellFromW, cellFromH));

    // 棋盘实际尺寸
    this.boardPixelWidth = this.cellSize * COLS;
    this.boardPixelHeight = this.cellSize * ROWS;

    // 总宽度 = 左面板 + 棋盘 + 右面板
    const leftPanelW = this.cellSize * sidePanelCells;
    const rightPanelW = this.cellSize * sidePanelCells;
    const totalW = leftPanelW + this.boardPixelWidth + rightPanelW;
    const totalH = this.boardPixelHeight;

    // 居中
    this.boardX = (w - totalW) / 2 + leftPanelW;
    this.boardY = topMargin;
    this.panelLeftX = (w - totalW) / 2;
    this.panelRightX = this.boardX + this.boardPixelWidth;
    this.panelTop = topMargin;
  }

  /** 主渲染循环 */
  render(game, now) {
    this.canvas.width = this.canvas.width; // 清除画布
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);

    this.lastTime = now;
    const ctx = this.ctx;

    // 背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制边栏
    this._drawSidePanels(game);

    // 绘制棋盘背景
    this._drawBoardBackground();

    // 绘制已固定的方块
    this._drawBoard(game);

    // 绘制 ghost piece
    if (game.currentPiece && game.state === STATE.PLAYING) {
      this._drawGhost(game);
    }

    // 绘制当前方块
    if (game.currentPiece && game.state === STATE.PLAYING) {
      this._drawPiece(game.currentPiece);
    }

    // 绘制暂停/结束遮罩
    if (game.state === STATE.PAUSED) {
      this._drawOverlay('暂停', '点击继续');
    }
  }

  /** 绘制棋盘网格背景 */
  _drawBoardBackground() {
    const ctx = this.ctx;
    const { cellSize, boardX, boardY } = this;

    // 棋盘背景
    ctx.fillStyle = COLORS.boardBg;
    ctx.fillRect(boardX, boardY, this.boardPixelWidth, this.boardPixelHeight);

    // 棋盘边框
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boardX, boardY, this.boardPixelWidth, this.boardPixelHeight);

    // 网格线
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      const x = boardX + c * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, boardY);
      ctx.lineTo(x, boardY + this.boardPixelHeight);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      const y = boardY + r * cellSize;
      ctx.beginPath();
      ctx.moveTo(boardX, y);
      ctx.lineTo(boardX + this.boardPixelWidth, y);
      ctx.stroke();
    }
  }

  /** 绘制棋盘中已固定的方块 */
  _drawBoard(game) {
    const ctx = this.ctx;
    const visibleGrid = game.board.getVisibleGrid();
    const { cellSize, boardX, boardY } = this;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = visibleGrid[r][c];
        if (cell) {
          const x = boardX + c * cellSize;
          const y = boardY + r * cellSize;
          this._drawCell(ctx, x, y, cellSize, COLORS[cell]);
        }
      }
    }
  }

  /** 绘制当前方块 */
  _drawPiece(piece) {
    const ctx = this.ctx;
    const cells = piece.getCells();
    const { cellSize, boardX, boardY } = this;

    for (const { col, row } of cells) {
      const visibleRow = row - HIDDEN_ROWS;
      if (visibleRow >= 0) {
        const x = boardX + col * cellSize;
        const y = boardY + visibleRow * cellSize;
        this._drawCell(ctx, x, y, cellSize, COLORS[piece.type]);
      }
    }
  }

  /** 绘制 ghost piece（落点预览） */
  _drawGhost(game) {
    const ctx = this.ctx;
    const piece = game.currentPiece;
    const ghostRow = piece.getGhostRow(game.board);
    const { cellSize, boardX, boardY } = this;

    const shape = SHAPES[piece.type][piece.rotation];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (shape[r][c]) {
          const visibleRow = ghostRow + r - HIDDEN_ROWS;
          if (visibleRow >= 0) {
            const x = boardX + (piece.col + c) * cellSize;
            const y = boardY + visibleRow * cellSize;
            ctx.fillStyle = COLORS.ghost;
            ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
          }
        }
      }
    }
  }

  /** 绘制单个 cell */
  _drawCell(ctx, x, y, size, color) {
    const inset = 1;
    const innerSize = size - inset * 2;

    // 主体填充
    ctx.fillStyle = color;
    ctx.fillRect(x + inset, y + inset, innerSize, innerSize);

    // 高光效果（左上亮）
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + inset, y + inset, innerSize, 2);
    ctx.fillRect(x + inset, y + inset, 2, innerSize);

    // 阴影效果（右下暗）
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + inset, y + innerSize - 2, innerSize, 2);
    ctx.fillRect(x + innerSize - 2, y + inset, 2, innerSize);
  }

  /** 绘制侧边栏信息 */
  _drawSidePanels(game) {
    const ctx = this.ctx;
    const { cellSize, panelLeftX, panelRightX, panelTop } = this;

    const panelW = cellSize * 5;
    const gap = cellSize * 0.5;

    // 左侧面板：Hold
    this._drawPanel(
      ctx, panelLeftX, panelTop, panelW, 'HOLD',
      game.holdPiece, cellSize
    );

    // 右侧面板：Next + Score
    const rightPanelY = panelTop;
    this._drawPanel(
      ctx, panelRightX, rightPanelY, panelW, 'NEXT',
      game.nextPiece?.type || null, cellSize
    );

    // 分数信息
    const infoX = panelRightX;
    const infoY = panelTop + cellSize * 4.5 + gap;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `bold ${cellSize * 0.5}px sans-serif`;
    ctx.textAlign = 'left';

    const stats = [
      `得分 ${game.score}`,
      `等级 ${game.level}`,
      `行数 ${game.lines}`,
    ];
    stats.forEach((text, i) => {
      ctx.fillText(text, infoX + 4, infoY + i * (cellSize * 0.7) + cellSize * 0.5);
    });
  }

  /** 绘制信息面板 */
  _drawPanel(ctx, x, y, width, label, pieceType, cellSize) {
    const height = cellSize * 4;

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `${cellSize * 0.45}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + width / 2, y + cellSize * 0.7);

    // Piece preview
    if (pieceType) {
      const shape = SHAPES[pieceType][0];
      const previewCellSize = cellSize * 0.7;
      const shapeRows = shape.length;
      const shapeCols = shape[0].length;

      // 计算实际占用格子数，居中
      let minC = 4, maxC = 0, minR = 4, maxR = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (shape[r][c]) {
            minC = Math.min(minC, c); maxC = Math.max(maxC, c);
            minR = Math.min(minR, r); maxR = Math.max(maxR, r);
          }
        }
      }
      const pieceW = (maxC - minC + 1) * previewCellSize;
      const pieceH = (maxR - minR + 1) * previewCellSize;
      const offsetX = x + (width - pieceW) / 2 - minC * previewCellSize;
      const offsetY = y + (height - pieceH) / 2 - minR * previewCellSize;

      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (shape[r][c]) {
            this._drawCell(ctx,
              offsetX + c * previewCellSize,
              offsetY + r * previewCellSize,
              previewCellSize,
              COLORS[pieceType]
            );
          }
        }
      }
    }
  }

  /** 绘制遮罩 */
  _drawOverlay(title, subtitle) {
    const ctx = this.ctx;
    const w = this.canvas.width / this.scale;
    const h = this.canvas.height / this.scale;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.min(w * 0.08, 36)}px sans-serif`;
    ctx.fillText(title, w / 2, h / 2 - 20);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `${Math.min(w * 0.04, 18)}px sans-serif`;
    ctx.fillText(subtitle, w / 2, h / 2 + 20);
  }
}
