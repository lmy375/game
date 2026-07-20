import { describe, it, expect } from "vitest";
import { levels, createRegistry } from "@data/index";
import { GridBoard, Position, resolveBoardData } from "@core/index";
import { battleBackgroundUrls } from "../src/platform/pixi/AssetManifest";

/**
 * 关卡资产校验:每关地图必须满足可玩性硬约束。
 * 地图改动(layout/站位)时本套件是第一道防线,campaignBalance 是第二道。
 */

const registry = createRegistry();

/** 敌我最近接敌路径(BFS,只看地形不看单位),期望 2~3 个回合内接敌。 */
const ENGAGE_RANGE: Record<string, [number, number]> = {
  default: [7, 14],
  level_009: [4, 9], // 合围关:玩家居中被包围,接敌距离刻意更近
};

function bfsDistances(board: GridBoard, from: Position): Map<string, number> {
  const dist = new Map<string, number>();
  const key = (p: Position) => `${p.x},${p.y}`;
  const queue: Position[] = [from];
  dist.set(key(from), 0);
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(key(cur))!;
    for (const n of [
      { x: cur.x + 1, y: cur.y },
      { x: cur.x - 1, y: cur.y },
      { x: cur.x, y: cur.y + 1 },
      { x: cur.x, y: cur.y - 1 },
    ]) {
      if (!board.isWalkable(n) || dist.has(key(n))) continue;
      dist.set(key(n), d + 1);
      queue.push(n);
    }
  }
  return dist;
}

describe.each(levels.map((lv) => [lv.id, lv] as const))("关卡校验 %s", (_id, level) => {
  const board = GridBoard.from(resolveBoardData(level.board));
  const spawns = [...level.playerUnits, ...level.enemyUnits];

  it("layout 可解析,棋盘为不规则轮廓(含 void)", () => {
    expect(board.width).toBeGreaterThan(0);
    let voids = 0;
    board.forEachTile((_p, t) => {
      if (t === "void") voids++;
    });
    expect(voids, "不规则地形应至少有 void 空气格").toBeGreaterThan(0);
  });

  it("可走区跨度符合尺寸要求(约 3~4 次最大移动)", () => {
    const xs: number[] = [];
    const ys: number[] = [];
    board.forEachTile((p, t) => {
      if (t !== "void" && board.isWalkable(p)) {
        xs.push(p.x);
        ys.push(p.y);
      }
    });
    const span = Math.max(Math.max(...xs) - Math.min(...xs) + 1, Math.max(...ys) - Math.min(...ys) + 1);
    expect(span).toBeGreaterThanOrEqual(14);
    expect(span).toBeLessThanOrEqual(20);
  });

  it("出生点全部可站立且互不重叠", () => {
    const seen = new Set<string>();
    for (const u of spawns) {
      const p = { x: u.x, y: u.y };
      expect(board.isWalkable(p), `${u.unitId}@(${u.x},${u.y}) 必须落在可走格`).toBe(true);
      const k = `${u.x},${u.y}`;
      expect(seen.has(k), `出生点 (${u.x},${u.y}) 重叠`).toBe(false);
      seen.add(k);
    }
  });

  it("全部出生点连通(无单位被空气墙隔离)", () => {
    const first = spawns[0];
    const dist = bfsDistances(board, { x: first.x, y: first.y });
    for (const u of spawns.slice(1)) {
      expect(dist.has(`${u.x},${u.y}`), `${u.unitId}@(${u.x},${u.y}) 与 ${first.unitId} 不连通`).toBe(true);
    }
  });

  it("敌我最近接敌路径距离在节奏区间内", () => {
    const [lo, hi] = ENGAGE_RANGE[level.id] ?? ENGAGE_RANGE.default;
    let best = Infinity;
    for (const p of level.playerUnits) {
      const dist = bfsDistances(board, { x: p.x, y: p.y });
      for (const e of level.enemyUnits) {
        const d = dist.get(`${e.x},${e.y}`);
        if (d !== undefined) best = Math.min(best, d);
      }
    }
    expect(best, `最近接敌路径距离 ${best} 应在 [${lo},${hi}]`).toBeGreaterThanOrEqual(lo);
    expect(best).toBeLessThanOrEqual(hi);
  });

  it("unitId 与 backgroundId 均有效", () => {
    for (const u of spawns) expect(() => registry.unit(u.unitId)).not.toThrow();
    if (level.backgroundId) {
      expect(level.backgroundId in battleBackgroundUrls, `backgroundId ${level.backgroundId} 不在资源清单`).toBe(true);
    }
  });
});
