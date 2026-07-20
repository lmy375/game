import { describe, it, expect } from "vitest";
import { parseLayout, LAYOUT_CHARS, GridBoard, TerrainType } from "@core/index";

const terrainOf = (layout: string[], x: number, y: number): TerrainType =>
  GridBoard.from(parseLayout(layout)).terrainAt({ x, y });

describe("parseLayout:ASCII 地图解析", () => {
  it("字符映射表全覆盖", () => {
    expect(LAYOUT_CHARS["."]).toBe("ground");
    expect(LAYOUT_CHARS["#"]).toBe("wall");
    expect(LAYOUT_CHARS["o"]).toBe("obstacle");
    expect(LAYOUT_CHARS["f"]).toBe("fire");
    expect(LAYOUT_CHARS["t"]).toBe("trap");
    expect(LAYOUT_CHARS["~"]).toBe("void");
    expect(LAYOUT_CHARS[" "]).toBe("void");
    const layout = [".#oft", "~ ..."];
    const data = parseLayout(layout);
    expect(data.width).toBe(5);
    expect(data.height).toBe(2);
    // 第一行(rowIndex=0)是 y=1
    expect(terrainOf(layout, 0, 1)).toBe("ground");
    expect(terrainOf(layout, 1, 1)).toBe("wall");
    expect(terrainOf(layout, 2, 1)).toBe("obstacle");
    expect(terrainOf(layout, 3, 1)).toBe("fire");
    expect(terrainOf(layout, 4, 1)).toBe("trap");
    expect(terrainOf(layout, 0, 0)).toBe("void");
    expect(terrainOf(layout, 1, 0)).toBe("void");
  });

  it("行序映射:layout[0] 是最远一行(y = height-1)", () => {
    // 第一行全墙、最后一行全地面:y=2 应为 wall,y=0 应为 ground
    const layout = ["###", "...", "..."];
    expect(terrainOf(layout, 0, 2)).toBe("wall");
    expect(terrainOf(layout, 0, 0)).toBe("ground");
    expect(terrainOf(layout, 0, 1)).toBe("ground");
  });

  it("短行右侧自动补 void,width 取最长行", () => {
    const layout = ["....", ".."];
    const data = parseLayout(layout);
    expect(data.width).toBe(4);
    expect(terrainOf(layout, 3, 0)).toBe("void"); // 第二行(y=0)第 4 列缺省
    expect(terrainOf(layout, 3, 1)).toBe("ground");
    // tiles 全量列出(含补齐的 void)
    expect(data.tiles.length).toBe(8);
  });

  it("非法字符抛错并包含行列号", () => {
    expect(() => parseLayout(["..", ".X"])).toThrowError(/第 2 行第 2 列.*"X"/);
  });

  it("空 layout 抛错", () => {
    expect(() => parseLayout([])).toThrowError();
    expect(() => parseLayout(["", ""])).toThrowError();
  });
});
