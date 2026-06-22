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
    // 触控按钮面板高度（固定值，与 CSS 一致）
    const buttonPanelH = Math.max(60, h * 0.1);
    // 顶部信息栏高度（HOLD / 分数 / NEXT）
    const topInfoH = Math.max(44, h * 0.05);

    // 棋盘可用高度 = 屏幕 - 顶部信息栏 - 触控按钮
    const boardAreaH = h - topInfoH - buttonPanelH;

    // 根据宽高计算 cell 尺寸
    const cellFromW = (w - 4) / COLS;
    const cellFromH = boardAreaH / ROWS;

    this.cellSize = Math.floor(Math.min(cellFromW, cellFromH));

    // 棋盘像素尺寸
    this.boardPixelWidth = this.cellSize * COLS;
    this.boardPixelHeight = this.cellSize * ROWS;

    // 棋盘居中
    this.boardX = Math.floor((w - this.boardPixelWidth) / 2);
    this.boardY = Math.floor((h - buttonPanelH - this.boardPixelHeight) / 2);

    // 顶部信息栏位置
    this.topInfoY = Math.max(0, this.boardY - topInfoH);
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

  /** 绘制顶部信息栏（HOLD / 分数 / NEXT） */
  _drawSidePanels(game) {
    const ctx = this.ctx;
    const { cellSize, boardX, boardY, boardPixelWidth, topInfoY } = this;
    const infoH = Math.max(40, this.topInfoY !== undefined ? boardY - topInfoY : 44);
    const gap = 6;

    // 信息栏背景
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(boardX, topInfoY, boardPixelWidth, infoH);

    // ─── 左：HOLD ───
    const holdBoxW = cellSize * 2.2;
    const holdBoxH = infoH - gap * 2;
    this._drawMiniPanel(ctx, boardX + gap, topInfoY + gap, holdBoxW, holdBoxH, 'HOLD', game.holdPiece, cellSize);

    // ─── 中：分数 ───
    const centerX = boardX + boardPixelWidth / 2;
    const infoY = topInfoY + infoH / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `bold ${Math.min(14, cellSize * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`得分 ${game.score}  等级 ${game.level}  行 ${game.lines}`, centerX, infoY + 4);

    // ─── 右：NEXT ───
    const nextBoxW = cellSize * 2.2;
    const nextBoxH = infoH - gap * 2;
    this._drawMiniPanel(ctx, boardX + boardPixelWidth - nextBoxW - gap, topInfoY + gap, nextBoxW, nextBoxH, 'NEXT', game.nextPiece?.type || null, cellSize);
  }

  /** 绘制迷你信息框（HOLD / NEXT） */
  _drawMiniPanel(ctx, x, y, w, h, label, pieceType, cellSize) {
    // 背景边框
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `${Math.min(10, cellSize * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + 12);

    // Piece preview
    if (pieceType) {
      const shape = SHAPES[pieceType][0];
      const ps = Math.min(cellSize * 0.4, 12);
      // 居中
      let minC = 4, maxC = 0, minR = 4, maxR = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (shape[r][c]) {
            minC = Math.min(minC, c); maxC = Math.max(maxC, c);
            minR = Math.min(minR, r); maxR = Math.max(maxR, r);
          }
        }
      }
      const pw = (maxC - minC + 1) * ps;
      const ph = (maxR - minR + 1) * ps;
      const ox = x + (w - pw) / 2 - minC * ps;
      const oy = y + (h - ph) / 2 - minR * ps + 4;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (shape[r][c]) {
            this._drawCell(ctx, ox + c * ps, oy + r * ps, ps, COLORS[pieceType]);
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
