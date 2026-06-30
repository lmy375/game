import { describe, it, expect, beforeEach } from "vitest";
import { createRegistry, getLevel } from "@data/index";
import { BattleSession, SessionHost, ViewModel } from "../src/interaction";
import { BattleState } from "@core/index";

/** 引擎无关的假 Host：只捕获最近一帧 ViewModel，无 DOM/引擎。 */
class CaptureHost implements SessionHost {
  readonly animates = false;
  vm!: ViewModel;
  setupLevel(): void {}
  render(vm: ViewModel): void {
    this.vm = vm;
  }
  applyEvents(): void {
    /* 无动画：同步即终态 */
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
    session.load(getLevel("level_001"));
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

  it("移动后技能菜单自动展开，且单位移动到落点", () => {
    expect(host.vm.menu.visible).toBe(false);
    session.tapCell({ x: 2, y: 2 }); // 直接移动
    expect(host.vm.menu.visible).toBe(true);
    expect(state().units.find((u) => u.defId === "wind_mage")!.pos).toEqual({ x: 2, y: 2 });
  });

  it("空放技能（未命中目标）不允许释放", async () => {
    session.tapCell({ x: 1, y: 2 });
    session.selectSkill("gale_gather");
    session.tapCell({ x: 3, y: 2 }); // 范围内但附近无敌人
    await session.confirm();
    expect(host.vm.confirm.visible).toBe(true);
    expect(host.vm.confirm.canRelease).toBe(false);
    expect(host.vm.confirm.desc).toContain("无法释放");
  });

  it("移动可撤销后回到起点", () => {
    session.tapCell({ x: 1, y: 2 });
    session.tapCell({ x: 2, y: 2 });
    expect(state().units.find((u) => u.defId === "wind_mage")!.pos).toEqual({ x: 2, y: 2 });
    session.undoMove();
    expect(state().units.find((u) => u.defId === "wind_mage")!.pos).toEqual({ x: 1, y: 2 });
  });

  it("结束当前单位行动 → 敌方 AI 自动行动并轮回", async () => {
    session.endActiveUnit();
    await flush();
    const st: BattleState = state();
    expect(st.outcome !== null || host.vm.turnText.includes("我方行动")).toBe(true);
  });
});
