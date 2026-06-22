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
    // 触控按钮面板高度（与 CSS 保持一致）
    const buttonPanelH = Math.max(56, h * 0.09);

    // 棋盘可用高度 = 全屏 - 触控按钮 - 顶部留白 2px
    const boardAreaH = h - buttonPanelH - 2;

    // 根据宽高计算 cell 尺寸（让棋盘尽可能大）
    const cellFromW = (w - 4) / COLS;
    const cellFromH = boardAreaH / ROWS;

    this.cellSize = Math.floor(Math.min(cellFromW, cellFromH));

    // 棋盘像素尺寸
    this.boardPixelWidth = this.cellSize * COLS;
    this.boardPixelHeight = this.cellSize * ROWS;

    // 棋盘居中（横向居中，纵向紧贴按钮上方）
    this.boardX = Math.floor((w - this.boardPixelWidth) / 2);
    this.boardY = Math.floor(h - buttonPanelH - this.boardPixelHeight);
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

  /** 在棋盘上叠加绘制 HOLD / NEXT / 分数 */
  _drawSidePanels(game) {
    const ctx = this.ctx;
    const { cellSize, boardX, boardY, boardPixelWidth } = this;
    const pad = Math.max(4, cellSize * 0.15);

    // ─── 左上：HOLD（叠加在棋盘上） ───
    const miniW = cellSize * 3.2;
    const miniH = cellSize * 2.6;
    this._drawMiniOverlay(ctx, boardX + pad, boardY + pad, miniW, miniH, 'HOLD', game.holdPiece, cellSize);

    // ─── 右上：NEXT（叠加在棋盘上） ───
    this._drawMiniOverlay(ctx, boardX + boardPixelWidth - miniW - pad, boardY + pad, miniW, miniH, 'NEXT', game.nextPiece?.type || null, cellSize);

    // ─── 顶上中间：分数 ───
    const centerX = boardX + boardPixelWidth / 2;
    const scoreY = boardY + pad + cellSize * 0.4;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const scoreText = `得分 ${game.score}  等级 ${game.level}`;
    const fontSize = Math.max(12, Math.min(16, cellSize * 0.5));
    ctx.font = `bold ${fontSize}px sans-serif`;
    const textW = ctx.measureText(scoreText).width;
    ctx.fillRect(centerX - textW / 2 - 6, scoreY - fontSize, textW + 12, fontSize + 4);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(scoreText, centerX, scoreY - 2);
  }

  /** 在棋盘上绘制半透明叠加信息框 */
  _drawMiniOverlay(ctx, x, y, w, h, label, pieceType, cellSize) {
    // 半透明背景
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x, y, w, h);

    // Label
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `bold ${Math.max(10, Math.min(13, cellSize * 0.35))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y + Math.max(14, cellSize * 0.4));

    // Piece preview
    if (pieceType) {
      const shape = SHAPES[pieceType][0];
      const ps = Math.max(8, Math.min(14, cellSize * 0.45));
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
      const oy = y + (h - ph) / 2 - minR * ps + Math.max(6, cellSize * 0.2);
      ctx.fillStyle = COLORS[pieceType];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (shape[r][c]) {
            ctx.fillRect(ox + c * ps + 1, oy + r * ps + 1, ps - 2, ps - 2);
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
