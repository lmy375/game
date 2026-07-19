import { describe, it, expect, beforeEach } from "vitest";
import { createRegistry, getLevel } from "@data/index";
import { loadMetaTables, initialSaveData } from "@data/metaIndex";
import { SaveData, SaveStore } from "@meta/index";
import { CampaignDirector, CampaignHost, CampaignBattleHooks, TitleVM, CutsceneVM, ResultVM, EndingVM, LoadoutVM } from "../src/campaign";
import { UnitStatPatch } from "../src/interaction";
import { livingUnits, BattleState, LevelDef } from "@core/index";

const registry = createRegistry();
const tables = loadMetaTables();

/** 内存存档（测试用）。 */
class MemStore implements SaveStore {
  data: SaveData | null = null;
  load() {
    return this.data;
  }
  save(d: SaveData) {
    this.data = d;
  }
  clear() {
    this.data = null;
  }
}

/** 记录各屏调用 + 捕获战斗 onEnd 的假 Host。 */
class FakeHost implements CampaignHost {
  title?: TitleVM;
  cutscene?: CutsceneVM;
  result?: ResultVM;
  ending?: EndingVM;
  battle?: { state: BattleState; hooks: CampaignBattleHooks };
  loadout?: LoadoutVM;
  /** 战斗中休整关闭后回写的属性补丁（最近一次）。 */
  statPatches?: UnitStatPatch[];
  hidden = 0;
  showTitle(vm: TitleVM) {
    this.title = vm;
  }
  showCutscene(vm: CutsceneVM) {
    this.cutscene = vm;
  }
  showResult(vm: ResultVM) {
    this.result = vm;
  }
  showEnding(vm: EndingVM) {
    this.ending = vm;
  }
  showLoadout(vm: LoadoutVM) {
    this.loadout = vm;
  }
  hideScreens() {
    this.hidden++;
  }
  startBattle(state: BattleState, _level: LevelDef, hooks: CampaignBattleHooks) {
    this.battle = { state, hooks };
  }
  updateBattleUnitStats(patches: UnitStatPatch[]) {
    this.statPatches = patches;
  }
}

/** 模拟 BattleController：把当前战斗判为玩家胜利并回调 onEnd。 */
function winCurrentBattle(host: FakeHost) {
  const { state, hooks } = host.battle!;
  for (const u of state.units) if (u.faction === "enemy") u.hp = 0;
  state.outcome = "player_win";
  hooks.onEnd("player_win", state);
}

describe("CampaignDirector 流程编排", () => {
  let host: FakeHost;
  let store: MemStore;
  let director: CampaignDirector;

  beforeEach(() => {
    host = new FakeHost();
    store = new MemStore();
    director = new CampaignDirector({ registry, tables, store, host, newSave: initialSaveData, levelOf: getLevel });
  });

  it("boot 显示标题；无存档时「继续」不可用", () => {
    director.boot();
    expect(host.title).toBeTruthy();
    expect(host.title!.hasSave).toBe(false);
    expect(host.title!.buttons.find((b) => b.id === "continue")!.enabled).toBe(false);
  });

  it("newGame → 过场；逐行推进后进入战斗（预装配状态、屏幕隐藏）", () => {
    director.boot();
    director.newGame();
    expect(host.cutscene).toBeTruthy();
    expect(host.cutscene!.nodeId).toBe("n_cut_1");
    for (let i = 0; i < 6; i++) director.advanceCutscene();
    expect(host.battle).toBeTruthy();
    expect(host.hidden).toBeGreaterThan(0);
    // 第一关火法师单人出战：技能栏预装基础技+招牌技，火墙秘卷（第 3 关掉落）未获得。
    const players = host.battle!.state.units.filter((u) => u.faction === "player");
    expect(players.map((u) => u.defId)).toEqual(["fire_mage"]);
    expect(players[0].skills).toEqual(["fire_bolt", "cross_fire"]);
    expect(players[0].skills).not.toContain("flame_wall");
  });

  it("过场 VM 带跳过文案；skipCutscene 不逐行、直接进入下一节点（战斗）", () => {
    director.boot();
    director.newGame();
    expect(host.cutscene!.skipLabel).toBe("跳过");
    director.advanceCutscene(); // 已推进一行，跳过应无视 cursor 位置
    director.skipCutscene();
    expect(host.battle).toBeTruthy();
    expect(host.hidden).toBeGreaterThan(0);
  });

  it("skipCutscene 在非过场节点（战斗中）是无害的空操作", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 6; i++) director.advanceCutscene(); // → 战斗
    const battle = host.battle;
    director.skipCutscene();
    expect(host.battle).toBe(battle); // 未重建战斗、未跳节点
  });

  it("胜利 → 结算屏含掉落战利品，技能秘卷标注自动装备去向；primary 推进到下一过场", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 6; i++) director.advanceCutscene();
    winCurrentBattle(host);

    expect(host.result).toBeTruthy();
    expect(host.result!.win).toBe(true);
    expect(host.result!.itemsGained.some((it) => it.name.includes("疾风护符"))).toBe(true);
    const tome = host.result!.itemsGained.find((it) => it.name.includes("横向推击"))!;
    expect(tome).toBeTruthy();
    expect(tome.equippedTo).toBe("风术士");

    director.onResultPrimary();
    expect(host.cutscene!.nodeId).toBe("n_cut_2");
  });

  it("第二场战斗：第一关掉落的秘卷已自动装备，风术士带横向推击入场", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 6; i++) director.advanceCutscene();
    winCurrentBattle(host); // 第一场（火法师单人）胜 → 掉落 tome_push_wave 自动装给风术士
    director.onResultPrimary(); // → 过场2
    for (let i = 0; i < 6; i++) director.advanceCutscene(); // → 第二场
    // 风术士第二关入队，带上自动装备的横向推击。
    const wind = host.battle!.state.units.find((u) => u.defId === "wind_mage")!;
    expect(wind.skills).toContain("push_wave");
    // 火法师属性 = 基础值（无等级成长）。
    const fire = host.battle!.state.units.find((u) => u.defId === "fire_mage")!;
    expect(fire.stats.magic).toBe(registry.unit("fire_mage").stats.magic);
  });

  it("通关到结局；存档持久化且可续", () => {
    director.boot();
    director.newGame();
    // 依次通关全部 10 关：每关先推进过场 → 战斗 → 结算 → 推进。
    for (let b = 1; b <= 10; b++) {
      for (let i = 0; i < 6; i++) director.advanceCutscene();
      expect(host.battle).toBeTruthy();
      winCurrentBattle(host);
      director.onResultPrimary();
    }
    expect(host.ending).toBeTruthy();
    expect(store.data).toBeTruthy();

    // 新 Director 读同一存档：标题「继续」可用
    const host2 = new FakeHost();
    const d2 = new CampaignDirector({ registry, tables, store, host: host2, newSave: initialSaveData, levelOf: getLevel });
    d2.boot();
    expect(host2.title!.hasSave).toBe(true);
  });

  it("整备界面装卸技能秘卷：持久化并在下一场生效", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 6; i++) director.advanceCutscene();
    winCurrentBattle(host); // 第一场胜 → tome_push_wave 自动装给风术士

    // 从结算进整备：风术士技能栏含横向推击秘卷，技能背包为空（都装上了）。
    director.openLoadout("result");
    const windPanel = host.loadout!.units.find((u) => u.defId === "wind_mage")!;
    expect(windPanel.skillSlots).toHaveLength(5);
    const tomeSlot = windPanel.skillSlots.find((s) => s.item?.itemId === "tome_push_wave")!;
    expect(tomeSlot).toBeTruthy();

    // 卸下 → 秘卷回背包（skillInventory 出现），技能栏空格。
    director.doUnequipSkill("wind_mage", tomeSlot.index);
    expect(host.loadout!.skillInventory.some((it) => it.itemId === "tome_push_wave")).toBe(true);
    expect(host.loadout!.units.find((u) => u.defId === "wind_mage")!.skillSlots[tomeSlot.index].item).toBeUndefined();

    // 重新装到指定格并持久化：下一场战斗生效。
    director.doEquipSkill("wind_mage", "tome_push_wave", 4);
    expect(host.loadout!.units.find((u) => u.defId === "wind_mage")!.skillSlots[4].item?.itemId).toBe("tome_push_wave");
    expect(store.data!.profile.units.find((u) => u.defId === "wind_mage")!.skillSlots[4]).toBe("tome_push_wave");

    director.closeLoadout(); // 返回结算
    director.onResultPrimary();
    for (let i = 0; i < 6; i++) director.advanceCutscene(); // → 第二场
    const wind = host.battle!.state.units.find((u) => u.defId === "wind_mage")!;
    expect(wind.skills).toContain("push_wave");
  });

  it("战斗中休整：onOpenLoadout 打开整备（返回战斗），关闭后回写属性补丁", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 6; i++) director.advanceCutscene();
    winCurrentBattle(host); // 第一场胜 → 掉落疾风护符（速度+15）
    director.onResultPrimary();
    for (let i = 0; i < 6; i++) director.advanceCutscene(); // 进入第二场战斗

    const speedInBattle = host.battle!.state.units.find((u) => u.defId === "fire_mage")!.stats.speed;

    // 玩家点「休整」→ 整备界面，返回按钮指向战斗。
    host.battle!.hooks.onOpenLoadout();
    expect(host.loadout).toBeTruthy();
    expect(host.loadout!.back.label).toBe("返回战斗");

    // 装上疾风护符后关闭 → 屏幕隐藏，补丁把速度加成带回战斗。
    const charm = host.loadout!.equipInventory.find((it) => it.itemId === "swift_charm");
    expect(charm).toBeTruthy();
    director.doEquip("fire_mage", charm!.itemId);
    const hiddenBefore = host.hidden;
    director.closeLoadout();
    expect(host.hidden).toBeGreaterThan(hiddenBefore);
    const patch = host.statPatches!.find((p) => p.defId === "fire_mage")!;
    expect(patch.stats.speed).toBe(speedInBattle + 15);
    expect(patch.maxHp).toBe(patch.stats.hp);
  });

  it("失败 → 结算为重试，primary 重建同一场（不推进）", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 5; i++) director.advanceCutscene();
    host.battle!.hooks.onEnd("enemy_win", host.battle!.state);
    expect(host.result!.win).toBe(false);
    expect(host.result!.primary.id).toBe("retry");
    director.onResultPrimary();
    expect(host.battle).toBeTruthy(); // 重新开战
    expect(host.ending).toBeUndefined(); // 未推进到结局
    void livingUnits; // 触达 import
  });
});
