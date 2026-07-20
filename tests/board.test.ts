import { describe, it, expect } from "vitest";
import { GridBoard, TERRAIN } from "@core/index";

describe("GridBoard:void 地形语义", () => {
  it("void profile:不可走、阻挡位移、不触发、不可破坏", () => {
    const v = TERRAIN.void;
    expect(v.blocksMove).toBe(true);
    expect(v.walkable).toBe(false);
    expect(v.blocksDisplacement).toBe(true);
    expect(v.triggersOnEnter).toBe(false);
    expect(v.destructible).toBe(false);
  });

  it("越界 terrainAt 返回 void,且移动/位移语义与旧 wall 等价", () => {
    const board = new GridBoard(3, 3);
    const outside = { x: -1, y: 0 };
    expect(board.terrainAt(outside)).toBe("void");
    // 与 wall 在移动/位移两个维度语义一致(历史上越界返回 wall)
    expect(TERRAIN.void.walkable).toBe(TERRAIN.wall.walkable);
    expect(TERRAIN.void.blocksMove).toBe(TERRAIN.wall.blocksMove);
    expect(TERRAIN.void.blocksDisplacement).toBe(TERRAIN.wall.blocksDisplacement);
    expect(board.isWalkable(outside)).toBe(false);
    expect(board.blocksDisplacement(outside)).toBe(true);
  });

  it("盘内 void 格:不可站立、阻挡位移", () => {
    const board = new GridBoard(3, 3, [{ x: 1, y: 1, terrain: "void" }]);
    expect(board.isWalkable({ x: 1, y: 1 })).toBe(false);
    expect(board.blocksDisplacement({ x: 1, y: 1 })).toBe(true);
    expect(board.isWalkable({ x: 0, y: 0 })).toBe(true);
  });
});
