const HIGH_SCORE_KEY = 'tetris_high_score';

export class Storage {
  /** 获取最高分 */
  static getHighScore() {
    try {
      const val = localStorage.getItem(HIGH_SCORE_KEY);
      return val ? parseInt(val, 10) : 0;
    } catch {
      return 0;
    }
  }

  /** 保存最高分（仅当新分数更高时） */
  static setHighScore(score) {
    try {
      const current = Storage.getHighScore();
      if (score > current) {
        localStorage.setItem(HIGH_SCORE_KEY, String(score));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}
