import { Position } from "@core/index";

export interface Arrow {
  from: Position;
  to: Position;
}
export interface DamageLabel {
  pos: Position;
  amount: number;
  lethal: boolean;
  kind: "damage" | "heal";
}

/** 叠加层数据(语义同 Web 版 RenderOverlay)。 */
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
