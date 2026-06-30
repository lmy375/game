/**
 * 基础几何类型与运算。纯函数，不依赖任何引擎。
 */

export interface Position {
  x: number;
  y: number;
}

export type Direction = "up" | "down" | "left" | "right";

export const ALL_DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

/** 方向对应的单位向量。约定：y 向上为正。 */
export const DIRECTION_VECTOR: Record<Direction, Position> = {
  up: { x: 0, y: 1 },
  down: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function eq(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function add(a: Position, b: Position): Position {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Position, b: Position): Position {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Position, k: number): Position {
  return { x: a.x * k, y: a.y * k };
}

/** 曼哈顿距离 */
export function manhattan(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** 切比雪夫距离（八方向） */
export function chebyshev(a: Position, b: Position): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function key(p: Position): string {
  return `${p.x},${p.y}`;
}

export function clone(p: Position): Position {
  return { x: p.x, y: p.y };
}

/** 从一个位置指向另一个位置的主方向（四方向）。用于换位/推动时推断方向。 */
export function directionTo(from: Position, to: Position): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "up" : "down";
}

export function opposite(dir: Direction): Direction {
  switch (dir) {
    case "up":
      return "down";
    case "down":
      return "up";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}
