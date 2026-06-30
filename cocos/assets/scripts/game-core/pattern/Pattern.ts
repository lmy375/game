// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 命中形状 Pattern：相对坐标 + 旋转。
 *
 * 约定：初始 Pattern 默认朝「上」(up)。系统根据释放方向把相对坐标旋转到最终朝向。
 * anchor 决定相对坐标的原点：
 *   - "target": 以目标格为中心（如十字火焰）
 *   - "caster_direction": 以施法者为原点、沿释放方向延伸（如直线、T 字）
 */
import { Position, Direction } from "../board/geometry";

export interface PatternCell {
  dx: number;
  dy: number;
  effectKey: string;
}

export interface PatternDef {
  id: string;
  name?: string;
  anchor: "target" | "caster_direction";
  rotatable: boolean;
  cells: PatternCell[];
}

/**
 * 将相对坐标按方向旋转。基准方向为 up（不旋转）。
 * 采用标准二维旋转（y 向上为正，逆时针为正角度）：
 *   up:    (dx, dy) -> (dx, dy)
 *   right: (dx, dy) -> (dy, -dx)   顺时针 90°
 *   down:  (dx, dy) -> (-dx, -dy)  180°
 *   left:  (dx, dy) -> (-dy, dx)   逆时针 90°
 */
export function rotateOffset(cell: { dx: number; dy: number }, dir: Direction): { dx: number; dy: number } {
  // nz: 规避 -0（仅为输出整洁，不影响坐标运算）
  const nz = (n: number) => (n === 0 ? 0 : n);
  switch (dir) {
    case "up":
      return { dx: nz(cell.dx), dy: nz(cell.dy) };
    case "right":
      return { dx: nz(cell.dy), dy: nz(-cell.dx) };
    case "down":
      return { dx: nz(-cell.dx), dy: nz(-cell.dy) };
    case "left":
      return { dx: nz(-cell.dy), dy: nz(cell.dx) };
  }
}

export interface ResolvedPatternCell {
  pos: Position;
  effectKey: string;
}

/**
 * 解析 Pattern 在战场上的最终命中格。
 * @param origin   anchor 原点（target：目标格；caster_direction：施法者所在格）
 * @param dir      释放方向（rotatable=false 时忽略）
 */
export function resolvePattern(
  pattern: PatternDef,
  origin: Position,
  dir: Direction = "up"
): ResolvedPatternCell[] {
  const useDir = pattern.rotatable ? dir : "up";
  return pattern.cells.map((c) => {
    const r = rotateOffset(c, useDir);
    return { pos: { x: origin.x + r.dx, y: origin.y + r.dy }, effectKey: c.effectKey };
  });
}
