import { Color } from "cc";

/** 十六进制 → Color(可带 alpha 0–255)。 */
export function hex(h: string, a = 255): Color {
  const c = new Color();
  Color.fromHEX(c, h);
  c.a = a;
  return c;
}

/** 地形配色,沿用 Web 版 CanvasRenderer 的 TERRAIN_COLOR。 */
export const TERRAIN: Record<string, Color> = {
  ground: hex("#39404e"),
  wall: hex("#191c24"),
  obstacle: hex("#5b4636"),
  fire: hex("#7a2a1c"),
  trap: hex("#46295c"),
};

/** 地形自发光(火/陷阱发光,增强 3D 场景氛围)。 */
export const TERRAIN_EMISSIVE: Record<string, Color | undefined> = {
  fire: hex("#ff6a2a"),
  trap: hex("#9a4ad9"),
};

/** 阵营主色(单位立绘)。 */
export const FACTION: Record<string, Color> = {
  player: hex("#4a90d9"),
  enemy: hex("#d9534f"),
};

/** 叠加层高亮色。 */
export const OVERLAY = {
  move: hex("#4a90d9", 90),
  cast: hex("#e8c840", 60),
  hitCenter: hex("#e8503f", 150),
  hitArm: hex("#e8843f", 120),
  finalBox: hex("#ffffff", 110),
  hazard: hex("#ff5030", 130),
  origin: hex("#9fb4d0", 80),
  hover: hex("#ffffff", 40),
};

export const UI = {
  panel: hex("#1b1f29", 235),
  panelEdge: hex("#2a3142"),
  text: hex("#e8edf6"),
  textDim: hex("#8c97ad"),
  accent: hex("#4a90d9"),
  danger: hex("#d9534f"),
  hpFull: hex("#5fcf6a"),
  hpLow: hex("#d9534f"),
  hpBack: hex("#11141b", 220),
  good: hex("#e8c840"),
  heal: hex("#5fcf6a"),
};
