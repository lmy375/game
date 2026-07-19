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
  /** 我方回合：敌方威胁区（可达格 / 攻击延伸格），垫底渲染。 */
  threatMoveCells?: Position[];
  threatAttackCells?: Position[];
  /** 敌方回合：当前行动敌人的移动范围预告。 */
  enemyMoveCells?: Position[];
}
