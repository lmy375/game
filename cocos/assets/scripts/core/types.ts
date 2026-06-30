import { Position } from "../game-core/index";

/** 位移箭头(从一格指向另一格)。 */
export interface Arrow {
  from: Position;
  to: Position;
}

/** 预览阶段在格上静态展示的伤害/治疗数字。 */
export interface DamageLabel {
  pos: Position;
  amount: number;
  lethal: boolean;
  kind: "damage" | "heal";
}

/**
 * 叠加层数据:控制器每帧据当前交互态算出,交给 OverlayView 画在棋盘上。
 * 字段语义与 Web 版 RenderOverlay 一致(见 src/platform/web/CanvasRenderer.ts)。
 */
export interface Overlay {
  selectedUnitId?: string;
  hoverCell?: Position;
  moveCells?: Position[];
  castCells?: Position[];
  hitCenter?: Position[];
  hitArm?: Position[];
  finalBoxes?: Position[];
  arrows?: Arrow[];
  damage?: DamageLabel[];
  hazardWarn?: Position[];
  originCell?: Position;
}
