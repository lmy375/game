// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BattleController, ControllerEls } from "../src/platform/web/BattleController";
import { createRegistry, getLevel } from "@data/index";
import { livingUnits } from "@core/index";

// jsdom 无 canvas 实现：用 no-op 上下文桩替代，验证表现层逻辑而非像素。
function stubCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "canvas") return canvas;
        return () => {};
      },
      set: () => true,
    }
  );
  // @ts-expect-error 覆盖原型方法
  canvas.getContext = () => ctx;
  canvas.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: canvas.width, height: canvas.height, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} } as DOMRect);
  return canvas;
}

function makeEls(): ControllerEls {
  const mk = () => document.createElement("div");
  return { menu: mk(), info: mk(), log: mk(), hint: mk(), turn: mk(), confirmBar: mk(), banner: mk() };
}

describe("Web 表现层冒烟", () => {
  const registry = createRegistry();
  let controller: BattleController;
  let els: ControllerEls;

  beforeEach(() => {
    vi.useFakeTimers();
    els = makeEls();
    controller = new BattleController(registry, stubCanvas(), els);
    controller.load(getLevel("level_001"));
  });

  it("加载关卡后渲染单位信息且不抛错", () => {
    expect(els.info.innerHTML).toContain("风术士");
    expect(els.info.innerHTML).toContain("近战兵");
    expect(els.info.innerHTML).toContain("行动顺序");
    // 速度最高的风术士(60) 先手
    expect(els.turn.textContent).toContain("我方行动");
  });

  it("技能菜单默认收起，点击行动单位自身才展开", () => {
    // 风术士在 level_001 (1,2)，是首个行动单位；默认不弹菜单（避免遮挡棋盘）
    expect(els.menu.style.display).toBe("none");
    controller.tapCell({ x: 1, y: 2 }); // 点击自身 → 展开
    expect(els.menu.style.display).toBe("flex");
    expect(els.menu.innerHTML).toContain("狂风聚拢");
    expect(els.menu.innerHTML).toContain("结束行动");
  });

  it("移动后技能菜单自动展开", () => {
    expect(els.menu.style.display).toBe("none");
    controller.tapCell({ x: 2, y: 2 }); // 直接移动（无需先开菜单）
    expect(els.menu.style.display).toBe("flex");
  });

  it("空放技能（未命中目标）不允许释放", () => {
    controller.tapCell({ x: 1, y: 2 }); // 选风术士
    controller.selectSkill("gale_gather");
    controller.tapCell({ x: 3, y: 2 }); // 范围内但附近无敌人
    controller.confirm();
    // 未产生效果，技能未结算 → 仍处于瞄准态（确认条仍显示）
    expect(els.confirmBar.style.display).toBe("flex");
    expect(els.confirmBar.innerHTML).toContain("无法释放");
  });

  it("移动可撤销后重新选择落点", () => {
    controller.tapCell({ x: 1, y: 2 }); // 选风术士
    controller.tapCell({ x: 2, y: 2 }); // 暂定移动
    const state = (controller as unknown as { state: import("@core/index").BattleState }).state;
    expect(state.units.find((u) => u.defId === "wind_mage")!.pos).toEqual({ x: 2, y: 2 });
    expect(els.menu.innerHTML).toContain("撤销移动");
    controller.undoMove();
    const state2 = (controller as unknown as { state: import("@core/index").BattleState }).state;
    expect(state2.units.find((u) => u.defId === "wind_mage")!.pos).toEqual({ x: 1, y: 2 });
  });

  it("移动后释放狂风聚拢（命中敌人）成功结算", () => {
    controller.tapCell({ x: 1, y: 2 }); // 选风术士
    controller.tapCell({ x: 4, y: 2 }); // 暂定移动靠近敌人
    controller.selectSkill("gale_gather");
    controller.tapCell({ x: 6, y: 2 }); // 中心点，敌人(6,1)在 3x3 内会被聚拢
    controller.confirm();
    // 产生了实际效果 → 技能结算，确认条关闭
    expect(els.confirmBar.style.display).toBe("none");
  });

  it("结束当前单位行动 → 敌方 AI 自动行动并轮回我方", async () => {
    controller.endActiveUnit(); // 风术士跳过
    await vi.runAllTimersAsync();
    const st = (controller as unknown as { state: import("@core/index").BattleState }).state;
    // 推进后要么分出胜负，要么轮到某个我方单位
    expect(st.outcome !== null || els.turn.textContent!.includes("我方行动")).toBe(true);
  });

  it("可以连续驱动若干个行动单位而不崩溃", async () => {
    for (let i = 0; i < 5; i++) {
      const st = (controller as unknown as { state: import("@core/index").BattleState }).state;
      if (st.outcome) break;
      const active = st.activeUnitId ? st.units.find((u) => u.instanceId === st.activeUnitId) : undefined;
      if (active && active.faction === "player") controller.endActiveUnit();
      await vi.runAllTimersAsync();
    }
    const state = (controller as unknown as { state: import("@core/index").BattleState }).state;
    expect(livingUnits(state).length).toBeGreaterThan(0);
  });
});
