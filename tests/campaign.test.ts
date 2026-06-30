import { describe, it, expect, beforeEach } from "vitest";
import { createRegistry, getLevel } from "@data/index";
import { loadMetaTables, initialSaveData } from "@data/metaIndex";
import { SaveData, SaveStore } from "@meta/index";
import { CampaignDirector, CampaignHost, TitleVM, CutsceneVM, ResultVM, EndingVM } from "../src/campaign";
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
  battle?: { state: BattleState; onEnd: (o: BattleState["outcome"], s: BattleState) => void };
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
  hideScreens() {
    this.hidden++;
  }
  startBattle(state: BattleState, _level: LevelDef, onEnd: (o: BattleState["outcome"], s: BattleState) => void) {
    this.battle = { state, onEnd };
  }
}

/** 模拟 BattleController：把当前战斗判为玩家胜利并回调 onEnd。 */
function winCurrentBattle(host: FakeHost) {
  const { state, onEnd } = host.battle!;
  for (const u of state.units) if (u.faction === "enemy") u.hp = 0;
  state.outcome = "player_win";
  onEnd("player_win", state);
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
    expect(host.cutscene!.nodeId).toBe("n_cut_intro");
    for (let i = 0; i < 5; i++) director.advanceCutscene();
    expect(host.battle).toBeTruthy();
    expect(host.hidden).toBeGreaterThan(0);
    // 第一场是 level_001 的预装配状态：wind_mage 起手无 push_wave
    const wind = host.battle!.state.units.find((u) => u.defId === "wind_mage")!;
    expect(wind.skills).not.toContain("push_wave");
  });

  it("胜利 → 结算屏含经验/升级/掉落；primary 推进到下一过场", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 5; i++) director.advanceCutscene();
    winCurrentBattle(host);

    expect(host.result).toBeTruthy();
    expect(host.result!.win).toBe(true);
    expect(host.result!.xpGained).toBeGreaterThan(0);
    expect(host.result!.levelUps.some((l) => l.name.includes("风术士"))).toBe(true);
    expect(host.result!.itemsGained.some((it) => it.name.includes("疾风护符"))).toBe(true);

    director.onResultPrimary();
    expect(host.cutscene!.nodeId).toBe("n_cut_mid");
  });

  it("第二场战斗：新技能 + 装备已在装配状态中生效", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 5; i++) director.advanceCutscene();
    winCurrentBattle(host); // 第一场胜
    director.onResultPrimary(); // → 过场2
    for (let i = 0; i < 5; i++) director.advanceCutscene(); // → 第二场
    const wind = host.battle!.state.units.find((u) => u.defId === "wind_mage")!;
    expect(wind.skills).toContain("push_wave"); // 升级解锁
    expect(wind.stats.speed).toBeGreaterThan(registry.unit("wind_mage").stats.speed); // 等级成长 + 自动装备
  });

  it("通关到结局；存档持久化且可续", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 5; i++) director.advanceCutscene();
    winCurrentBattle(host);
    director.onResultPrimary();
    for (let i = 0; i < 5; i++) director.advanceCutscene();
    winCurrentBattle(host);
    director.onResultPrimary();
    expect(host.ending).toBeTruthy();
    expect(store.data).toBeTruthy();

    // 新 Director 读同一存档：标题「继续」可用
    const host2 = new FakeHost();
    const d2 = new CampaignDirector({ registry, tables, store, host: host2, newSave: initialSaveData, levelOf: getLevel });
    d2.boot();
    expect(host2.title!.hasSave).toBe(true);
  });

  it("失败 → 结算为重试，primary 重建同一场（不推进）", () => {
    director.boot();
    director.newGame();
    for (let i = 0; i < 5; i++) director.advanceCutscene();
    const { onEnd } = host.battle!;
    onEnd("enemy_win", host.battle!.state);
    expect(host.result!.win).toBe(false);
    expect(host.result!.primary.id).toBe("retry");
    director.onResultPrimary();
    expect(host.battle).toBeTruthy(); // 重新开战
    expect(host.ending).toBeUndefined(); // 未推进到结局
    void livingUnits; // 触达 import
  });
});
