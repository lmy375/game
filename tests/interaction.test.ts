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

/** 引擎无关的假 Host：捕获最近一帧 ViewModel、全部帧与呈现事件的时间线，无 DOM/引擎。 */
class CaptureHost implements SessionHost {
  readonly animates = false;
  vm!: ViewModel;
  events: BattleEvent[] = [];
  /** 全部渲染帧（按时间顺序）。 */
  frames: ViewModel[] = [];
  /** render/applyEvents 交错时间线，用于断言「预告帧出现在动作事件之前」。 */
  timeline: ({ kind: "frame"; vm: ViewModel } | { kind: "events"; events: BattleEvent[] })[] = [];
  setupLevel(): void {}
  render(vm: ViewModel): void {
    this.vm = vm;
    this.frames.push(vm);
    this.timeline.push({ kind: "frame", vm });
  }
  applyEvents(events: BattleEvent[]): void {
    this.events.push(...events); // 无动画：同步即终态
    this.timeline.push({ kind: "events", events });
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
    const blade = host.vm.menu.skills.find((s) => s.id === "wind_blade");
    expect(blade?.short).toContain("100%");
    expect(blade?.short).not.toMatch(/造成 1$/); // 回归：短文案不得截断自完整描述
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
    session.selectSkill("wind_blade"); // 进入瞄准 → 菜单隐藏（不挡棋盘）
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

describe("敌方威胁范围（我方回合常显）", () => {
  let host: CaptureHost;
  let session: BattleSession;

  beforeEach(() => {
    host = new CaptureHost();
    session = new BattleSession(registry, host);
    session.load(TUTORIAL_LEVEL);
  });

  it("我方回合初始帧即显示威胁区：含敌人所在格与攻击延伸格，移动范围照常", () => {
    const o = host.vm.overlay;
    expect(o.moveCells?.length).toBeGreaterThan(0);
    expect(o.threatMoveCells?.length).toBeGreaterThan(0);
    expect(o.threatAttackCells?.length).toBeGreaterThan(0);
    // 敌兵站位格必在威胁移动层内
    expect(o.threatMoveCells).toContainEqual({ x: 3, y: 4 });
    // 两层互斥
    const mv = new Set(o.threatMoveCells!.map((p) => `${p.x},${p.y}`));
    for (const p of o.threatAttackCells!) expect(mv.has(`${p.x},${p.y}`)).toBe(false);
  });

  it("进入技能瞄准隐藏威胁区，取消后恢复", () => {
    session.tapCell({ x: 1, y: 2 }); // 展开菜单（非瞄准）→ 威胁仍显示
    expect(host.vm.overlay.threatMoveCells?.length).toBeGreaterThan(0);
    session.selectSkill("wind_blade"); // 瞄准 → 隐藏
    expect(host.vm.overlay.threatMoveCells).toBeUndefined();
    expect(host.vm.overlay.threatAttackCells).toBeUndefined();
    session.cancel(); // 退出瞄准 → 恢复
    expect(host.vm.overlay.threatMoveCells?.length).toBeGreaterThan(0);
  });

  it("暂定移动后威胁区随新 state 重算（仍存在且不报错）", () => {
    session.tapCell({ x: 1, y: 2 });
    session.tapCell({ x: 2, y: 2 }); // 暂定移动 → state 引用更换
    expect(host.vm.overlay.threatMoveCells?.length).toBeGreaterThan(0);
    session.undoMove();
    expect(host.vm.overlay.threatMoveCells?.length).toBeGreaterThan(0);
  });
});

describe("敌方行动预告（先亮范围再行动）", () => {
  /** 一对一小关卡：敌兵距风术士 4 格，必须先移动再劈砍。 */
  const DUEL_LEVEL: LevelDef = {
    id: "test_duel",
    name: "对决",
    playerFirst: true,
    board: { width: 8, height: 3, tiles: [] },
    playerUnits: [{ unitId: "wind_mage", x: 0, y: 1 }],
    enemyUnits: [{ unitId: "enemy_soldier", x: 4, y: 1 }],
    winCondition: { type: "defeat_all_enemies" },
  };

  it("移动前出现移动范围预告帧（基于移动前位置），技能前出现命中格预告帧，回合结束后清除", async () => {
    const host = new CaptureHost();
    const session = new BattleSession(registry, host);
    session.load(DUEL_LEVEL);

    // CT 制下风术士速度更高可能连动多次：持续让行动，直到敌兵移动过（有上限护栏）。
    for (let i = 0; i < 10 && !host.events.some((e) => e.type === "unit_moved"); i++) {
      session.endActiveUnit();
      await flush();
    }

    // 时间线中：移动预告帧必须先于敌方 unit_moved 事件
    const moveTelegraphIdx = host.timeline.findIndex(
      (t) => t.kind === "frame" && (t.vm.overlay.enemyMoveCells?.length ?? 0) > 0
    );
    const enemyMovedIdx = host.timeline.findIndex(
      (t) => t.kind === "events" && t.events.some((e) => e.type === "unit_moved")
    );
    expect(enemyMovedIdx).toBeGreaterThan(-1); // 敌兵必须移动（劈砍够不着）
    expect(moveTelegraphIdx).toBeGreaterThan(-1);
    expect(moveTelegraphIdx).toBeLessThan(enemyMovedIdx);

    // 预告基于移动前位置：从 (4,1) 出发 moveRange=3 可达 (7,1)；移动后不可能
    const telegraph = host.timeline[moveTelegraphIdx] as { kind: "frame"; vm: ViewModel };
    expect(telegraph.vm.overlay.enemyMoveCells).toContainEqual({ x: 7, y: 1 });

    // 敌兵移动 3 格后与法师相邻，必然劈砍：命中格预告帧必须先于 skill_cast 事件
    const castIdx = host.timeline.findIndex(
      (t) => t.kind === "events" && t.events.some((e) => e.type === "skill_cast")
    );
    expect(castIdx).toBeGreaterThan(-1);
    const hitTelegraphIdx = host.timeline.findIndex(
      (t) =>
        t.kind === "frame" &&
        ((t.vm.overlay.hitCenter?.length ?? 0) > 0 || (t.vm.overlay.hitArm?.length ?? 0) > 0)
    );
    expect(hitTelegraphIdx).toBeGreaterThan(-1);
    expect(hitTelegraphIdx).toBeLessThan(castIdx);

    // 轮回我方后：预告清除，威胁区恢复显示
    expect(host.vm.turnText).toContain("我方行动");
    expect(host.vm.overlay.enemyMoveCells).toBeUndefined();
    expect(host.vm.overlay.hitCenter).toBeUndefined();
    expect(host.vm.overlay.hitArm).toBeUndefined();
    expect(host.vm.overlay.threatMoveCells?.length).toBeGreaterThan(0);
  });
});

describe("void(空气)格交互拦截", () => {
  /** 风术士站在崖边,(3,2)~(4,2) 一带是 void。 */
  const VOID_LEVEL: LevelDef = {
    id: "test_void",
    name: "崖边",
    playerFirst: true,
    board: {
      layout: [
        "......",
        "...~~.",
        "......",
      ],
    },
    playerUnits: [{ unitId: "wind_mage", x: 2, y: 1 }],
    enemyUnits: [{ unitId: "enemy_soldier", x: 5, y: 0 }],
    winCondition: { type: "defeat_all_enemies" },
  };

  let host: CaptureHost;
  let session: BattleSession;

  beforeEach(() => {
    host = new CaptureHost();
    session = new BattleSession(registry, host);
    session.load(VOID_LEVEL);
  });

  it("layout 关卡可加载,void 不可走", () => {
    const s = session.getState();
    expect(s.board.width).toBe(6);
    expect(s.board.height).toBe(3);
    expect(s.board.terrainAt({ x: 3, y: 1 })).toBe("void");
    expect(s.board.isWalkable({ x: 3, y: 1 })).toBe(false);
  });

  it("hover 到 void 格:无 hover 高亮", () => {
    session.hoverCell({ x: 3, y: 1 });
    expect(host.vm.overlay.hoverCell).toBeUndefined();
    session.hoverCell({ x: 1, y: 1 });
    expect(host.vm.overlay.hoverCell).toEqual({ x: 1, y: 1 });
  });

  it("点击 void 格:视为点空处,收起菜单且不移动", () => {
    session.tapCell({ x: 2, y: 1 }); // 点自身展开菜单
    expect(host.vm.menu.visible).toBe(true);
    const before = session.getState().units[0].pos;
    session.tapCell({ x: 3, y: 1 }); // 点 void
    expect(host.vm.menu.visible).toBe(false);
    expect(session.getState().units[0].pos).toEqual(before);
  });

  it("瞄准中 castCells 不含 void 格", () => {
    session.tapCell({ x: 2, y: 1 });
    const skillId = host.vm.menu.skills[0]?.id;
    expect(skillId).toBeTruthy();
    session.selectSkill(skillId!);
    const cast = host.vm.overlay.castCells ?? [];
    for (const c of cast) {
      expect(session.getState().board.terrainAt(c)).not.toBe("void");
    }
  });

  it("移动范围不含 void 与被隔断的格", () => {
    const move = host.vm.overlay.moveCells ?? [];
    expect(move.some((p) => p.x === 3 && p.y === 1)).toBe(false);
    expect(move.some((p) => p.x === 4 && p.y === 1)).toBe(false);
  });
});
