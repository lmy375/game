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
    // 第一关火法师单人出战：起手无 fire_bolt（3 级才解锁）。
    const players = host.battle!.state.units.filter((u) => u.faction === "player");
    expect(players.map((u) => u.defId)).toEqual(["fire_mage"]);
    expect(players[0].skills).not.toContain("fire_bolt");
  });

  it("胜利 → 结算屏含经验/升级/掉落；primary 推进到下一过场", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 6; i++) director.advanceCutscene();
    winCurrentBattle(host);

    expect(host.result).toBeTruthy();
    expect(host.result!.win).toBe(true);
    expect(host.result!.xpGained).toBeGreaterThan(0);
    expect(host.result!.levelUps.some((l) => l.name.includes("火法师"))).toBe(true);
    expect(host.result!.itemsGained.some((it) => it.name.includes("疾风护符"))).toBe(true);

    director.onResultPrimary();
    expect(host.cutscene!.nodeId).toBe("n_cut_2");
  });

  it("第二场战斗：上一场成长进入预装配状态；新成员按队伍加入", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 6; i++) director.advanceCutscene();
    winCurrentBattle(host); // 第一场（火法师单人）胜
    director.onResultPrimary(); // → 过场2
    for (let i = 0; i < 6; i++) director.advanceCutscene(); // → 第二场
    // 火法师打完第一关升级，魔力成长已体现在装配状态中。
    const fire = host.battle!.state.units.find((u) => u.defId === "fire_mage")!;
    expect(fire.stats.magic).toBeGreaterThan(registry.unit("fire_mage").stats.magic);
    // 风术士第二关入队。
    expect(host.battle!.state.units.some((u) => u.defId === "wind_mage")).toBe(true);
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

  it("升级后结算屏出现加点面板；allocateStat 持久化并在下一场生效", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 6; i++) director.advanceCutscene();
    winCurrentBattle(host); // 第一场胜（火法师单人）→ 升 2 级，获 pointsPerLevel 点

    const pts = tables.progression.pointsPerLevel;
    const firePanel = host.result!.allocations!.find((a) => a.name.includes("火法师"))!;
    expect(firePanel.unspentPoints).toBe(pts);
    const magicBase = registry.unit("fire_mage").stats.magic;

    // 加 1 点魔力 → 面板即时刷新、点数 -1。
    director.allocateStat("fire_mage", "magic");
    const firePanel2 = host.result!.allocations!.find((a) => a.name.includes("火法师"))!;
    expect(firePanel2.unspentPoints).toBe(pts - 1);

    // 推进到第二场：buildBattleState 反映加点。
    director.onResultPrimary();
    for (let i = 0; i < 6; i++) director.advanceCutscene();
    const fire = host.battle!.state.units.find((u) => u.defId === "fire_mage")!;
    // 2 级 fire_mage magic 成长 +5，另加 1 点 → base + 5 + 1。
    expect(fire.stats.magic).toBe(magicBase + 5 + 1);
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
