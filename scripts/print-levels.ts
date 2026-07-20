/**
 * 关卡地图设计辅助:终端打印每关 ASCII 地形(带坐标轴与出生点),并报告
 * 可走格数 / 跨度 / 连通性 / 敌我最近接敌路径距离。只读,不进构建。
 *
 * 用法:pnpm levels:print(借用 vitest 自带的 vite-node,无需额外依赖)
 */
import { levels } from "../src/game-data";
import { GridBoard, Position, resolveBoardData, TerrainType } from "../src/game-core";

const CH: Record<TerrainType, string> = { ground: "·", wall: "▓", obstacle: "◆", fire: "火", trap: "陷", void: " " };

function bfs(board: GridBoard, from: Position): Map<string, number> {
  const dist = new Map<string, number>([[`${from.x},${from.y}`, 0]]);
  const queue: Position[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(`${cur.x},${cur.y}`)!;
    for (const n of [
      { x: cur.x + 1, y: cur.y },
      { x: cur.x - 1, y: cur.y },
      { x: cur.x, y: cur.y + 1 },
      { x: cur.x, y: cur.y - 1 },
    ]) {
      if (board.isWalkable(n) && !dist.has(`${n.x},${n.y}`)) {
        dist.set(`${n.x},${n.y}`, d + 1);
        queue.push(n);
      }
    }
  }
  return dist;
}

for (const level of levels) {
  const board = GridBoard.from(resolveBoardData(level.board));
  const playerAt = new Map(level.playerUnits.map((u, i) => [`${u.x},${u.y}`, String(i + 1)]));
  const enemyAt = new Set(level.enemyUnits.map((u) => `${u.x},${u.y}`));

  console.log(`\n== ${level.id} ${level.name} (${board.width}x${board.height}) ==`);
  for (let y = board.height - 1; y >= 0; y--) {
    let row = `y${String(y).padStart(2)} `;
    for (let x = 0; x < board.width; x++) {
      const k = `${x},${y}`;
      row += playerAt.get(k) ?? (enemyAt.has(k) ? "敌" : CH[board.terrainAt({ x, y })]);
    }
    console.log(row);
  }

  const land: Position[] = [];
  board.forEachTile((p, t) => {
    if (t !== "void" && board.isWalkable(p)) land.push(p);
  });
  const xs = land.map((p) => p.x);
  const ys = land.map((p) => p.y);
  const span = Math.max(Math.max(...xs) - Math.min(...xs) + 1, Math.max(...ys) - Math.min(...ys) + 1);
  const reach = bfs(board, land[0]);
  const connected = land.every((p) => reach.has(`${p.x},${p.y}`));

  let engage = Infinity;
  for (const p of level.playerUnits) {
    const dist = bfs(board, { x: p.x, y: p.y });
    for (const e of level.enemyUnits) {
      engage = Math.min(engage, dist.get(`${e.x},${e.y}`) ?? Infinity);
    }
  }
  console.log(`可走 ${land.length} 格 | 跨度 ${span} | 连通 ${connected ? "是" : "否!"} | 最近接敌 ${engage} 格`);
}
