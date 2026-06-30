// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 战斗评分器：从敌方视角给战斗状态打分。分越高对敌方越有利。
 * 关键：内置「扎堆惩罚」「直线惩罚」「危险地形惩罚」，让敌人不愿成为 AOE 靶子（PRD 10/20.3）。
 */
import { BattleState, livingUnits } from "../state/BattleState";
import { manhattan } from "../board/geometry";
import { Unit } from "../unit/Unit";

export interface EvalWeights {
  enemyAlive: number;
  enemyHp: number;
  playerAlive: number;
  playerHp: number;
  clusterPenalty: number;
  linePenalty: number;
  onHazard: number;
  nearHazard: number;
  lowHpExposed: number;
}

export const DEFAULT_WEIGHTS: EvalWeights = {
  enemyAlive: 60,
  enemyHp: 1,
  playerAlive: 80,
  playerHp: 2,
  clusterPenalty: 18,
  linePenalty: 22,
  onHazard: 30,
  nearHazard: 8,
  lowHpExposed: 20,
};

export function evaluateForEnemy(state: BattleState, w: EvalWeights = DEFAULT_WEIGHTS): number {
  const enemies = livingUnits(state, "enemy");
  const players = livingUnits(state, "player");

  let score = 0;
  score += w.enemyAlive * enemies.length;
  score += w.enemyHp * sumHp(enemies);
  score -= w.playerAlive * players.length;
  score -= w.playerHp * sumHp(players);

  // 扎堆惩罚：任意两敌人曼哈顿距离 <=1
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      if (manhattan(enemies[i].pos, enemies[j].pos) <= 1) score -= w.clusterPenalty;
    }
  }

  // 直线惩罚：三个敌人在同一行/列且彼此较近
  score -= w.linePenalty * countLinedTriples(enemies);

  // 危险地形
  for (const e of enemies) {
    if (isHazard(state, e.pos)) score -= w.onHazard;
    else if (adjacentToHazard(state, e.pos)) score -= w.nearHazard;
    // 残血暴露：低血量且贴近玩家
    if (e.hp / e.maxHp < 0.35 && players.some((p) => manhattan(p.pos, e.pos) <= 1)) {
      score -= w.lowHpExposed;
    }
  }

  return score;
}

function sumHp(units: Unit[]): number {
  return units.reduce((s, u) => s + u.hp, 0);
}

function isHazard(state: BattleState, p: { x: number; y: number }): boolean {
  const t = state.board.terrainAt(p);
  return t === "fire" || t === "trap";
}

function adjacentToHazard(state: BattleState, p: { x: number; y: number }): boolean {
  return (
    isHazard(state, { x: p.x + 1, y: p.y }) ||
    isHazard(state, { x: p.x - 1, y: p.y }) ||
    isHazard(state, { x: p.x, y: p.y + 1 }) ||
    isHazard(state, { x: p.x, y: p.y - 1 })
  );
}

/** 统计「同一行/列且两两间距<=3」的敌人三元组数量。 */
function countLinedTriples(enemies: Unit[]): number {
  let count = 0;
  for (let i = 0; i < enemies.length; i++) {
    for (let j = i + 1; j < enemies.length; j++) {
      for (let k = j + 1; k < enemies.length; k++) {
        const a = enemies[i].pos;
        const b = enemies[j].pos;
        const c = enemies[k].pos;
        const sameRow = a.y === b.y && b.y === c.y;
        const sameCol = a.x === b.x && b.x === c.x;
        if (!sameRow && !sameCol) continue;
        const near =
          manhattan(a, b) <= 3 && manhattan(b, c) <= 3 && manhattan(a, c) <= 4;
        if (near) count++;
      }
    }
  }
  return count;
}
