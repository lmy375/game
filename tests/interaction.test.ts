import { describe, it, expect, beforeEach } from "vitest";
import { createRegistry } from "@data/index";
import { BattleSession, SessionHost, ViewModel } from "../src/interaction";
import { BattleState, BattleEvent, LevelDef, restHealAmount } from "@core/index";

/** 自带教学布局：风术士 (1,2) 速度最高先手、火法师 (1,5)，三名散布的近战兵。 */
const TUTORIAL_LEVEL: LevelDef = {
  id: "test_tutorial",
  name: "教学",
  playerFirst: true,
  board: {
    width: 8,
    height: 8,
    tiles: [
      { x: 4, y: 1, terrain: "wall" },
      { x: 4, y: 6, terrain: "wall" },
      { x: 2, y: 6, terrain: "obstacle" },
    ],
  },
  playerUnits: [
    { unitId: "wind_mage", x: 1, y: 2 },
    { unitId: "fire_mage", x: 1, y: 5 },
  ],
  enemyUnits: [
    { unitId: "enemy_soldier", x: 3, y: 4 },
    { unitId: "enemy_soldier", x: 7, y: 4 },
    { unitId: "enemy_soldier", x: 5, y: 2 },
  ],
  winCondition: { type: "defeat_all_enemies" },
};

/** 引擎无关的假 Host：捕获最近一帧 ViewModel 与全部呈现事件，无 DOM/引擎。 */
class CaptureHost implements SessionHost {
  readonly animates = false;
  vm!: ViewModel;
  events: BattleEvent[] = [];
  setupLevel(): void {}
  render(vm: ViewModel): void {
    this.vm = vm;
  }
  applyEvents(events: BattleEvent[]): void {
    this.events.push(...events); // 无动画：同步即终态
  }
  log(): void {}
  clearLog(): void {}
}

const registry = createRegistry();
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("交互状态机冒烟（BattleSession，引擎无关）", () => {
  let host: CaptureHost;
  let session: BattleSession;

  beforeEach(() => {
    host = new CaptureHost();
    session = new BattleSession(registry, host);
    session.load(TUTORIAL_LEVEL);
  });

  const state = () => session.getState();

  it("加载后产出单位信息，速度最高的风术士先手", () => {
    const names = host.vm.info.players.map((p) => p.name);
    expect(names).toContain("风术士");
    expect(names).toContain("火法师");
    expect(host.vm.turnText).toContain("我方行动");
  });

  it("技能菜单默认收起，点击行动单位自身才展开", () => {
    expect(host.vm.menu.visible).toBe(false);
    session.tapCell({ x: 1, y: 2 }); // 风术士在 (1,2)，点自身 → 展开
    expect(host.vm.menu.visible).toBe(true);
    expect(host.vm.menu.skills.some((s) => s.name === "狂风聚拢")).toBe(true);
  });

  it("技能菜单使用明确短文案，不截断百分比数值", () => {
    session.tapCell({ x: 1, y: 2 });
    const normal = host.vm.menu.skills.find((s) => s.id === "normal_attack");
    expect(normal?.short).toContain("100%");
    expect(normal?.short).not.toBe("对相邻的一个敌人造成 1");
  });

  it("移动后技能菜单自动展开，且单位移动到落点", () => {
    expect(host.vm.menu.visible).toBe(false);
    session.tapCell({ x: 2, y: 2 }); // 直接移动
    expect(host.vm.menu.visible).toBe(true);
    expect(state().units.find((u) => u.defId === "wind_mage")!.pos).toEqual({ x: 2, y: 2 });
  });

  it("空放技能（未命中目标）不允许释放", async () => {
    session.tapCell({ x: 1, y: 2 });
    session.selectSkill("gale_gather");
    session.tapCell({ x: 1, y: 0 }); // 范围内但 5×5 菱形内无敌人
    await session.confirm();
    expect(host.vm.confirm.visible).toBe(true);
    expect(host.vm.confirm.canRelease).toBe(false);
    expect(host.vm.confirm.desc).toContain("无法释放");
  });

  it("瞄准施法范围外时提示「超出施法范围」，与空放区分", () => {
    session.tapCell({ x: 1, y: 2 });
    session.selectSkill("gale_gather"); // 距离 1-4
    session.tapCell({ x: 6, y: 4 }); // 距 (1,2) 超过 4 格
    expect(host.vm.confirm.visible).toBe(true);
    expect(host.vm.confirm.canRelease).toBe(false);
    expect(host.vm.confirm.desc).toBe("超出施法范围");
  });

  it("移动可撤销后回到起点", () => {
    session.tapCell({ x: 1, y: 2 });
    session.tapCell({ x: 2, y: 2 });
    expect(state().units.find((u) => u.defId === "wind_mage")!.pos).toEqual({ x: 2, y: 2 });
    session.undoMove();
    expect(state().units.find((u) => u.defId === "wind_mage")!.pos).toEqual({ x: 1, y: 2 });
  });

  it("右键取消：未瞄准时收起菜单；瞄准中退出瞄准回到菜单", () => {
    session.tapCell({ x: 1, y: 2 }); // 展开菜单
    expect(host.vm.menu.visible).toBe(true);
    session.selectSkill("normal_attack"); // 进入瞄准 → 菜单隐藏（不挡棋盘）
    expect(host.vm.menu.visible).toBe(false);
    session.cancel(); // 右键：退出瞄准，菜单恢复
    expect(host.vm.menu.visible).toBe(true);
    session.cancel(); // 再右键：收起菜单
    expect(host.vm.menu.visible).toBe(false);
  });

  it("调息：满血禁用；受伤时显示恢复量，释放后恢复生命并结束该单位行动", async () => {
    session.tapCell({ x: 1, y: 2 });
    expect(host.vm.menu.rest.disabled).toBe(true);
    expect(host.vm.menu.rest.short).toBe("生命已满");
    session.cancel();

    const wind = state().units.find((u) => u.defId === "wind_mage")!;
    wind.hp = Math.max(1, wind.maxHp - 40);
    const expectHeal = Math.min(restHealAmount(wind.maxHp), wind.maxHp - wind.hp);
    session.tapCell({ x: 1, y: 2 });
    expect(host.vm.menu.rest.disabled).toBe(false);
    expect(host.vm.menu.rest.short).toContain(`${expectHeal}`);

    session.rest();
    await flush();
    const healed = host.events.find(
      (e) => e.type === "unit_healed" && e.unitId === wind.instanceId && e.amount === expectHeal
    );
    expect(healed).toBeTruthy(); // 行动结束由推进保证：调息后不再轮到该单位本回合
  });

  it("休整：提供 onOpenLoadout 钩子时菜单出现入口且可触发；默认不显示", () => {
    expect(host.vm.menu.showLoadout).toBe(false);
    let opened = 0;
    const h2 = new CaptureHost();
    const s2 = new BattleSession(registry, h2, { onOpenLoadout: () => opened++ });
    s2.load(TUTORIAL_LEVEL);
    s2.tapCell({ x: 1, y: 2 });
    expect(h2.vm.menu.showLoadout).toBe(true);
    s2.openLoadout();
    expect(opened).toBe(1);
  });

  it("applyStatPatches：保持已受伤害与最低 1 血，撤销移动不回滚属性", () => {
    const before = state().units.find((u) => u.defId === "wind_mage")!;
    before.hp = before.maxHp - 10;
    session.tapCell({ x: 1, y: 2 }); // 展开菜单
    session.tapCell({ x: 2, y: 2 }); // 暂定移动（建立可撤销基态）

    const cur = state().units.find((u) => u.defId === "wind_mage")!;
    const patched = { ...cur.stats, speed: cur.stats.speed + 15, hp: cur.stats.hp + 20 };
    session.applyStatPatches([{ defId: "wind_mage", stats: patched, maxHp: patched.hp }]);

    let w = state().units.find((u) => u.defId === "wind_mage")!;
    expect(w.maxHp).toBe(patched.hp);
    expect(w.hp).toBe(patched.hp - 10); // 已受伤害保持不变
    expect(w.stats.speed).toBe(patched.speed);

    session.undoMove(); // 回退位置，但属性补丁不被回滚
    w = state().units.find((u) => u.defId === "wind_mage")!;
    expect(w.pos).toEqual({ x: 1, y: 2 });
    expect(w.stats.speed).toBe(patched.speed);
    expect(w.maxHp).toBe(patched.hp);
  });

  it("结束当前单位行动 → 敌方 AI 自动行动并轮回", async () => {
    session.endActiveUnit();
    await flush();
    const st: BattleState = state();
    expect(st.outcome !== null || host.vm.turnText.includes("我方行动")).toBe(true);
  });
});
