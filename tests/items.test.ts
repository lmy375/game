import { describe, it, expect } from "vitest";
import { createRegistry } from "@data/index";
import { loadMetaTables } from "@data/metaIndex";
import {
  PlayerProfile,
  equipItem,
  unequipItem,
  consumeItem,
  inventoryStacks,
  equipBonusesFor,
  emptyEquipped,
} from "@meta/index";
import { BattleSimulator, applyItemEffect, unitById } from "@core/index";
import { BattleSession, SessionHost, ViewModel, BattleItem } from "../src/interaction";
import { makeUnit, makeState } from "./helpers";

const registry = createRegistry();
const tables = loadMetaTables();

/** 造一个只有一个玩家单位的 profile。 */
function soloProfile(): PlayerProfile {
  return {
    units: [{ defId: "wind_mage", level: 1, xp: 0, learnedSkills: ["wind_blade"], equipped: emptyEquipped(), unspentPoints: 0, allocated: {}, skillLevels: {} }],
    inventory: [],
    storyNodeId: "n",
  };
}

describe("背包：装备穿脱", () => {
  it("装备入槽（槽位由物品决定），出背包", () => {
    const p = soloProfile();
    p.inventory = ["iron_sword"];
    const next = equipItem(p, "wind_mage", "iron_sword", tables.items);
    expect(next.units[0].equipped.weapon).toBe("iron_sword");
    expect(next.inventory).toEqual([]);
    // 纯函数：不改入参。
    expect(p.units[0].equipped.weapon).toBeNull();
    expect(p.inventory).toEqual(["iron_sword"]);
  });

  it("同槽再装：原装备退回背包", () => {
    let p = soloProfile();
    p.inventory = ["iron_sword", "oak_staff"];
    p = equipItem(p, "wind_mage", "iron_sword", tables.items);
    p = equipItem(p, "wind_mage", "oak_staff", tables.items);
    expect(p.units[0].equipped.weapon).toBe("oak_staff");
    expect(p.inventory).toEqual(["iron_sword"]); // 铁剑被换下退回
  });

  it("卸下退回背包；不在背包的物品无法装备", () => {
    let p = soloProfile();
    p.inventory = ["leather_armor"];
    p = equipItem(p, "wind_mage", "leather_armor", tables.items);
    expect(p.units[0].equipped.armor).toBe("leather_armor");
    p = unequipItem(p, "wind_mage", "armor");
    expect(p.units[0].equipped.armor).toBeNull();
    expect(p.inventory).toContain("leather_armor");
    // 背包没有的物品：原样返回。
    const same = equipItem(p, "wind_mage", "iron_sword", tables.items);
    expect(same).toBe(p);
  });

  it("消耗品不可作为装备穿上（无槽位，原样返回）", () => {
    const p = soloProfile();
    p.inventory = ["minor_potion"];
    expect(equipItem(p, "wind_mage", "minor_potion", tables.items)).toBe(p);
  });
});

describe("背包：消耗与聚合", () => {
  it("consumeItem 移除一个；inventoryStacks 按 id 聚合计数", () => {
    const p = soloProfile();
    p.inventory = ["minor_potion", "minor_potion", "purify_herb"];
    const stacks = inventoryStacks(p);
    expect(stacks).toEqual([
      { itemId: "minor_potion", count: 2 },
      { itemId: "purify_herb", count: 1 },
    ]);
    const next = consumeItem(p, "minor_potion");
    expect(next.inventory).toEqual(["minor_potion", "purify_herb"]);
    expect(p.inventory.length).toBe(3); // 不改入参
  });
});

describe("多槽装备加成累加", () => {
  it("三槽加成合计，正确抬升对应属性", () => {
    const equipped = { weapon: "iron_sword", armor: "leather_armor", accessory: "swift_charm" };
    const bonuses = equipBonusesFor(equipped, tables.items);
    const sum = (stat: string) => bonuses.filter((b) => b.stat === stat).reduce((a, b) => a + b.amount, 0);
    expect(sum("attack")).toBe(4); // 铁剑
    expect(sum("hp")).toBe(15); // 皮甲
    expect(sum("defense")).toBe(2); // 皮甲
    expect(sum("speed")).toBe(15); // 疾风护符
  });
});

describe("core: use_item 动作", () => {
  it("heal 补血且不超过 maxHp；占用技能行动、仍可移动", () => {
    const sim = new BattleSimulator(registry);
    const hero = makeUnit("player", { x: 0, y: 0 }, { instanceId: "p1", stats: { hp: 100 }, hp: 40, maxHp: 100 });
    const state = makeState(5, 5, [hero]);
    const res = sim.simulate(state, { type: "use_item", actorId: "p1", targetUnitId: "p1", itemId: "minor_potion", effect: { type: "heal", amount: 30 } });
    expect(res.ok).toBe(true);
    const after = unitById(res.nextState, "p1")!;
    expect(after.hp).toBe(70);
    expect(after.actedThisTurn).toBe(true);
    expect(after.movedThisTurn).toBe(false); // 仍可移动
    expect(res.events.some((e) => e.type === "item_used")).toBe(true);
    expect(res.events.some((e) => e.type === "unit_healed")).toBe(true);
  });

  it("heal 不超过 maxHp", () => {
    const sim = new BattleSimulator(registry);
    const hero = makeUnit("player", { x: 0, y: 0 }, { instanceId: "p1", stats: { hp: 100 }, hp: 90, maxHp: 100 });
    const res = sim.simulate(makeState(5, 5, [hero]), { type: "use_item", actorId: "p1", targetUnitId: "p1", itemId: "minor_potion", effect: { type: "heal", amount: 30 } });
    expect(unitById(res.nextState, "p1")!.hp).toBe(100);
  });

  it("cleanse 清除全部负面状态并发 unit_status_expired", () => {
    const sim = new BattleSimulator(registry);
    const hero = makeUnit("player", { x: 0, y: 0 }, { instanceId: "p1", statuses: [{ id: "burn", duration: 2, magnitude: 5 }, { id: "stun", duration: 1 }] });
    const res = sim.simulate(makeState(5, 5, [hero]), { type: "use_item", actorId: "p1", targetUnitId: "p1", itemId: "purify_herb", effect: { type: "cleanse" } });
    expect(unitById(res.nextState, "p1")!.statuses).toEqual([]);
    const expired = res.events.filter((e) => e.type === "unit_status_expired");
    expect(expired.length).toBe(2);
  });

  it("已行动的单位不能再用道具", () => {
    const sim = new BattleSimulator(registry);
    const hero = makeUnit("player", { x: 0, y: 0 }, { instanceId: "p1", actedThisTurn: true, hp: 40, maxHp: 100, stats: { hp: 100 } });
    const res = sim.simulate(makeState(5, 5, [hero]), { type: "use_item", actorId: "p1", targetUnitId: "p1", itemId: "minor_potion", effect: { type: "heal", amount: 30 } });
    expect(res.ok).toBe(false);
  });

  it("applyItemEffect 直接调用：heal 追加 unit_healed 事件", () => {
    const target = makeUnit("player", { x: 0, y: 0 }, { hp: 10, maxHp: 100, stats: { hp: 100 } });
    const state = makeState(3, 3, [target]);
    const events: import("@core/index").BattleEvent[] = [];
    applyItemEffect(state, target, { type: "heal", amount: 25 }, events);
    expect(target.hp).toBe(35);
    expect(events).toHaveLength(1);
  });
});

/** 无动画、静默的 SessionHost（测试用）。 */
class QuietHost implements SessionHost {
  readonly animates = false;
  last?: ViewModel;
  setupLevel() {}
  render(vm: ViewModel) {
    this.last = vm;
  }
  applyEvents() {}
  log() {}
  clearLog() {}
}

describe("BattleSession：战斗内使用消耗品", () => {
  it("选道具→对自身释放：补血、count 递减、onItemConsumed 回调", async () => {
    const host = new QuietHost();
    const consumed: string[] = [];
    const battleItems: BattleItem[] = [{ itemId: "minor_potion", name: "初级药水", description: "", effect: { type: "heal", amount: 30 }, range: 1, count: 2 }];
    // 单个玩家单位（受伤），一个远处敌人（不干扰）。用 buildState 注入自定义 state。
    const hero = makeUnit("player", { x: 1, y: 1 }, { instanceId: "p1", name: "英雄", faction: "player", skills: ["wind_blade"], hp: 40, maxHp: 100, stats: { hp: 100 }, ct: 100 });
    const enemy = makeUnit("enemy", { x: 4, y: 4 }, { instanceId: "e1", faction: "enemy", ct: 0 });
    const state = makeState(6, 6, [hero, enemy]);
    state.activeUnitId = "p1";

    const session = new BattleSession(registry, host, { buildState: () => state, battleItems, onItemConsumed: (id) => consumed.push(id) });
    session.load({ id: "t", name: "测试", board: { width: 6, height: 6 }, units: [] } as never);

    // 道具菜单出现（先展开菜单：点自身）。
    session.tapCell({ x: 1, y: 1 });
    expect(host.last!.items.visible).toBe(true);
    expect(host.last!.items.items[0].count).toBe(2);

    // 选道具（range 1，会自动锁定自身），确认释放。
    session.selectItem("minor_potion");
    await session.confirm();

    const after = unitById(session.getState(), "p1")!;
    expect(after.hp).toBe(70);
    expect(after.actedThisTurn).toBe(true);
    expect(consumed).toEqual(["minor_potion"]);
  });
});
