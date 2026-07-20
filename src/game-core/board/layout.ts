/**
 * ASCII 地图格式:每行字符串代表棋盘一行,每个字符一格,所见即所得地描述不规则地形。
 *
 * 行序映射(关键约定):geometry 的 y 向上为正、y 越大越靠画面后方,
 * 所以 layout[0](文本第一行)是最远的一行,即 y = height - 1 - rowIndex;x = colIndex。
 * 这样 ASCII 图的视觉方位与等距投影后的画面方位一致。
 */
import { BoardData, TileData } from "./GridBoard";
import { TerrainType } from "./terrain";

export const LAYOUT_CHARS: Record<string, TerrainType> = {
  ".": "ground",
  "#": "wall",
  o: "obstacle",
  f: "fire",
  t: "trap",
  "~": "void",
  " ": "void", // 行尾可省略,短行右侧自动补 void
};

/** 解析 ASCII layout 为棋盘数据。未知字符抛错(含行列号),fail-fast。 */
export function parseLayout(layout: string[]): Required<BoardData> {
  if (layout.length === 0) throw new Error("layout 不能为空");
  const height = layout.length;
  const width = Math.max(...layout.map((row) => row.length));
  if (width === 0) throw new Error("layout 每行不能全为空字符串");

  const tiles: TileData[] = [];
  layout.forEach((row, rowIndex) => {
    const y = height - 1 - rowIndex;
    for (let x = 0; x < width; x++) {
      const ch = x < row.length ? row[x] : " ";
      const terrain = LAYOUT_CHARS[ch];
      if (terrain === undefined) {
        throw new Error(`layout 第 ${rowIndex + 1} 行第 ${x + 1} 列存在非法字符 "${ch}"`);
      }
      tiles.push({ x, y, terrain });
    }
  });
  return { width, height, tiles };
}
