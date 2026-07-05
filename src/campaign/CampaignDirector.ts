/**
 * 流程编排（引擎无关）：走剧情图，遇战斗节点用 game-meta 装配并交给战斗层，
 * 战斗结束算奖励/升级/存档，再展示结算并推进。镜像 BattleSession 的「状态机 + Host」模式。
 *
 * 跨战斗的真相在 game-meta；本类只编排「下一屏是什么」并驱动 CampaignHost。
 */
import { ContentRegistry, LevelDef, BattleState, UnitStats } from "@core/index";
import {
  PlayerProfile,
  SaveData,
  MetaTables,
  SaveStore,
  buildBattleState,
  computeRewards,
  applyRewards,
  processCombatXp,
  allocatePoint,
  composeUnitStats,
  unitProgress,
  nodeById,
  advance,
  StoryNode,
  CutsceneNode,
  LevelUpResult,
  EquipSlot,
  EQUIP_SLOTS,
  ItemTable,
  StatBonus,
  isEquip,
  isConsumable,
  equipBonusesFor,
  equipItem,
  unequipItem,
  consumeItem,
  inventoryStacks,
} from "@meta/index";
import { BattleItem } from "../interaction";
import {
  CampaignHost,
  TitleVM,
  CutsceneVM,
  PortraitVM,
  CutsceneLineVM,
  ResultLevelUpVM,
  ResultItemVM,
  ResultVM,
  StatAllocationVM,
  StatRowVM,
  LoadoutVM,
  LoadoutUnitVM,
  LoadoutSlotVM,
  InventoryItemVM,
} from "./types";

/** 可手动加点的属性（不含 moveRange，避免机动性被点数轻易堆爆）。 */
const ALLOCATABLE_STATS: { key: keyof UnitStats; label: string }[] = [
  { key: "hp", label: "生命" },
  { key: "attack", label: "攻击" },
  { key: "magic", label: "魔力" },
  { key: "defense", label: "防御" },
  { key: "speed", label: "速度" },
];

/** 装备槽位中文名。 */
const SLOT_LABELS: Record<EquipSlot, string> = { weapon: "武器", armor: "护甲", accessory: "饰品" };

export interface CampaignDeps {
  registry: ContentRegistry;
  tables: MetaTables;
  store: SaveStore;
  host: CampaignHost;
  /** 新游戏的起始存档（来自 @data/metaIndex，保持 campaign 不依赖 @data）。 */
  newSave: () => SaveData;
  /** levelId -> LevelDef（来自 @data 的 getLevel）。 */
  levelOf: (levelId: string) => LevelDef;
}

type PendingResult = { kind: "win"; battleNodeId: string } | { kind: "lose"; battleNodeId: string };

export class CampaignDirector {
  private profile!: PlayerProfile;
  private nodeId!: string;
  private cursor = 0;
  private pending: PendingResult | null = null;
  /** 当前进行中的战斗（供调试强制结算）。 */
  private activeBattle: { battleNodeId: string; state: BattleState } | null = null;
  /** 胜利结算屏的静态部分（加点期间反复重渲染，故缓存）。 */
  private lastWin: { xpGained: number; levelUps: ResultLevelUpVM[]; itemsGained: ResultItemVM[] } | null = null;
  /** 整备界面的返回目标（从标题或结算屏进入）。 */
  private loadoutReturn: "title" | "result" = "title";
  /** 整备界面是否正在显示（决定加点后重渲染哪块屏）。 */
  private inLoadout = false;

  constructor(private readonly deps: CampaignDeps) {}

  // ---------- 启动 ----------
  /** 显示标题：有存档则「继续」可用。不自动续档。 */
  boot(): void {
    this.inLoadout = false;
    const saved = this.deps.store.load();
    const start = nodeById(this.deps.tables.story, this.deps.tables.story.startId);
    this.profile = this.deps.newSave().profile;
    this.nodeId = this.deps.tables.story.startId;
    this.deps.host.showTitle(this.titleVM(start.kind === "title" ? start.title : "阵形之术", !!saved, start));
  }

  newGame(): void {
    this.profile = this.deps.newSave().profile;
    this.nodeId = this.deps.tables.story.startId;
    this.persist();
    this.enterNode(advance(this.deps.tables.story, this.nodeId) ?? this.nodeId);
  }

  continueGame(): void {
    const saved = this.deps.store.load();
    if (!saved) {
      this.newGame();
      return;
    }
    this.profile = saved.profile;
    this.nodeId = saved.profile.storyNodeId;
    this.enterNode(this.nodeId);
  }

  // ---------- 意图（表现层按钮触发）----------
  advanceCutscene(): void {
    const node = nodeById(this.deps.tables.story, this.nodeId);
    if (node.kind !== "cutscene") return;
    if (this.cursor < node.lines.length - 1) {
      this.cursor++;
      this.deps.host.showCutscene(this.cutsceneVM(node));
    } else {
      this.resolveTo(advance(this.deps.tables.story, this.nodeId));
    }
  }

  skipCutscene(): void {
    const node = nodeById(this.deps.tables.story, this.nodeId);
    if (node.kind !== "cutscene") return;
    this.resolveTo(advance(this.deps.tables.story, this.nodeId));
  }

  onResultPrimary(): void {
    if (!this.pending) return;
    if (this.pending.kind === "lose") {
      this.enterNode(this.pending.battleNodeId); // 重试，重建同一场
    } else {
      this.enterNode(this.nodeId); // 胜利时 nodeId 已指向结算后的节点
    }
    this.pending = null;
    this.lastWin = null;
  }

  /** 加点：给某单位某属性 +1（消耗未分配点），持久化并重渲染当前所在屏（结算/整备均可）。 */
  allocateStat(defId: string, stat: keyof UnitStats): void {
    const up = unitProgress(this.profile, defId);
    if (!up || up.unspentPoints <= 0) return;
    const idx = this.profile.units.findIndex((u) => u.defId === defId);
    this.profile.units[idx] = allocatePoint(up, stat);
    this.persist();
    if (this.inLoadout) this.deps.host.showLoadout(this.loadoutVM());
    else if (this.lastWin) this.showWinResult();
  }

  toTitle(): void {
    this.boot();
  }

  // ---------- 整备界面 ----------
  /** 打开整备。从标题进入时若有存档则载入该档编辑（改动落到进行中的游戏）。 */
  openLoadout(from: "title" | "result" = "title"): void {
    this.loadoutReturn = from;
    this.inLoadout = true;
    if (from === "title") {
      const saved = this.deps.store.load();
      if (saved) {
        this.profile = saved.profile;
        this.nodeId = saved.profile.storyNodeId;
      }
    }
    this.deps.host.showLoadout(this.loadoutVM());
  }

  /** 关闭整备，回到来源屏（结算/标题）。 */
  closeLoadout(): void {
    this.inLoadout = false;
    if (this.loadoutReturn === "result") this.showWinResult();
    else this.boot();
  }

  /** 给某单位装上背包里的一件装备（槽位由物品决定）。 */
  doEquip(defId: string, itemId: string): void {
    this.profile = equipItem(this.profile, defId, itemId, this.deps.tables.items);
    this.persist();
    this.deps.host.showLoadout(this.loadoutVM());
  }

  /** 卸下某单位某槽的装备（退回背包）。 */
  doUnequip(defId: string, slot: EquipSlot): void {
    this.profile = unequipItem(this.profile, defId, slot);
    this.persist();
    this.deps.host.showLoadout(this.loadoutVM());
  }

  // ---------- 调试 ----------
  getProfile(): PlayerProfile {
    return this.profile;
  }
  goToNode(nodeId: string): void {
    this.nodeId = nodeId;
    this.enterNode(nodeId);
  }
  /** 调试：直接以指定结果结算当前战斗（用于自动化走查，不经实战）。 */
  debugEndBattle(outcome: "player_win" | "enemy_win"): void {
    if (!this.activeBattle) return;
    const { battleNodeId, state } = this.activeBattle;
    if (outcome === "player_win") for (const u of state.units) if (u.faction === "enemy") u.hp = 0;
    state.outcome = outcome;
    this.onBattleEnd(battleNodeId, outcome, state);
  }

  // ---------- 内部流程 ----------
  private resolveTo(nextId: string | null): void {
    if (!nextId) return;
    this.nodeId = nextId;
    this.persist();
    this.enterNode(nextId);
  }

  private enterNode(id: string): void {
    this.nodeId = id;
    const node = nodeById(this.deps.tables.story, id);
    switch (node.kind) {
      case "title":
        this.deps.host.showTitle(this.titleVM(node.title, !!this.deps.store.load(), node));
        return;
      case "cutscene":
        this.cursor = 0;
        this.deps.host.showCutscene(this.cutsceneVM(node));
        return;
      case "battle": {
        const level = this.deps.levelOf(node.levelId);
        const state = buildBattleState(this.profile, level, this.deps.registry, this.deps.tables);
        this.activeBattle = { battleNodeId: id, state };
        this.deps.host.hideScreens();
        const battleNodeId = id;
        this.deps.host.startBattle(
          state,
          level,
          (outcome, finalState) => this.onBattleEnd(battleNodeId, outcome, finalState),
          (events, battleState) =>
            processCombatXp(events, battleState, this.profile, this.deps.registry, this.deps.tables),
          this.battleConsumables(),
          (itemId) => {
            this.profile = consumeItem(this.profile, itemId);
            this.persist();
          }
        );
        return;
      }
      case "ending":
        this.deps.host.showEnding({
          title: node.title,
          lines: node.lines,
          buttons: [{ id: "toTitle", label: "返回标题" }],
        });
        return;
      case "result":
        // result 节点不单独进入：战斗结束时由 onBattleEnd 直接呈现结算。
        // 若因存档直接落到 result（异常），跳过到下一节点。
        this.resolveTo(advance(this.deps.tables.story, id));
        return;
    }
  }

  private onBattleEnd(battleNodeId: string, outcome: BattleState["outcome"], finalState: BattleState): void {
    const level = this.deps.levelOf((nodeById(this.deps.tables.story, battleNodeId) as { levelId: string }).levelId);

    if (outcome === "player_win") {
      const rewards = computeRewards(level, finalState, this.deps.tables.levelRewards);
      const { profile, levelUps, totalXpGained } = applyRewards(this.profile, rewards, finalState, this.deps.tables);
      this.profile = profile; // 掉落物入背包，玩家在整备界面手动装备

      const resultNodeId = advance(this.deps.tables.story, battleNodeId); // result 节点
      const afterResultId = resultNodeId ? advance(this.deps.tables.story, resultNodeId) : null;
      this.nodeId = afterResultId ?? battleNodeId;
      this.persist(); // 存档落在结算后的下一节点，刷新可从那里续

      this.pending = { kind: "win", battleNodeId };
      this.lastWin = {
        xpGained: totalXpGained,
        levelUps: levelUps.map((lu) => this.levelUpVM(lu)),
        itemsGained: rewards.itemDrops.map((id) => {
          const it = this.deps.tables.items[id];
          return { name: it?.name ?? id, description: it?.description ?? "" };
        }),
      };
      this.showWinResult();
    } else {
      this.pending = { kind: "lose", battleNodeId };
      this.deps.host.showResult({
        win: false,
        title: "战败",
        xpGained: 0,
        levelUps: [],
        itemsGained: [],
        primary: { id: "retry", label: "重试" },
      });
    }
  }

  /** 从背包装配本场可用消耗品池（供战斗内使用）。 */
  private battleConsumables(): BattleItem[] {
    const items = this.deps.tables.items;
    const out: BattleItem[] = [];
    for (const stack of inventoryStacks(this.profile)) {
      const def = items[stack.itemId];
      if (!def || !isConsumable(def) || !def.effect) continue;
      out.push({
        itemId: def.id,
        name: def.name,
        description: def.description,
        effect: def.effect,
        range: def.range ?? 0,
        count: stack.count,
      });
    }
    return out;
  }

  private persist(): void {
    this.profile.storyNodeId = this.nodeId;
    this.deps.store.save({ version: 2, profile: this.profile });
  }

  // ---------- VM 构建 ----------
  private titleVM(title: string, hasSave: boolean, node: StoryNode): TitleVM {
    return {
      title,
      subtitle: node.kind === "title" ? node.subtitle : undefined,
      hasSave,
      buttons: [
        { id: "new", label: "新游戏", enabled: true },
        { id: "continue", label: "继续", enabled: hasSave },
        { id: "loadout", label: "整备", enabled: true },
      ],
    };
  }

  private cutsceneVM(node: CutsceneNode): CutsceneVM {
    const lines: CutsceneLineVM[] = node.lines.map((l) => ({
      speaker: l.speaker,
      text: l.text,
      portrait: l.glyph ? this.portraitForGlyph(l.glyph, l.speaker) : undefined,
    }));
    return { nodeId: node.id, lines, cursor: this.cursor, continueLabel: "继续 ▶" };
  }

  /** 用缓存的静态部分 + 实时加点面板重渲染胜利结算屏。 */
  private showWinResult(): void {
    if (!this.lastWin) return;
    this.inLoadout = false;
    const vm: ResultVM = {
      win: true,
      title: "胜利",
      xpGained: this.lastWin.xpGained,
      levelUps: this.lastWin.levelUps,
      itemsGained: this.lastWin.itemsGained,
      allocations: this.allocationsVM(),
      primary: { id: "advance", label: "继续" },
      secondary: { id: "loadout", label: "整备" },
    };
    this.deps.host.showResult(vm);
  }

  /** 为有未分配点数的单位构建加点面板（当前值 = 等级成长 + 已加点，不含装备）。 */
  private allocationsVM(): StatAllocationVM[] | undefined {
    const panels: StatAllocationVM[] = [];
    for (const up of this.profile.units) {
      if (up.unspentPoints <= 0) continue;
      const name = this.unitName(up.defId);
      // 展示当前值 = 等级成长 + 已加点（不含装备）。
      panels.push({
        defId: up.defId,
        name,
        portrait: this.unitPortrait(name),
        unspentPoints: up.unspentPoints,
        stats: this.composedStatRows(up, []),
      });
    }
    return panels.length ? panels : undefined;
  }

  /** 构建整备界面 VM：各单位三槽 + 属性预览（含装备加成），背包按装备/消耗品分列。 */
  private loadoutVM(): LoadoutVM {
    const items: ItemTable = this.deps.tables.items;
    const units: LoadoutUnitVM[] = this.profile.units.map((up) => {
      const name = this.unitName(up.defId);
      const slots: LoadoutSlotVM[] = EQUIP_SLOTS.map((slot) => {
        const id = up.equipped[slot];
        const it = id ? items[id] : undefined;
        return {
          slot,
          label: SLOT_LABELS[slot],
          item: it ? { itemId: it.id, name: it.name, description: it.description } : undefined,
        };
      });
      // 属性预览含装备加成。
      const stats = this.composedStatRows(up, equipBonusesFor(up.equipped, items));
      return { defId: up.defId, name, portrait: this.unitPortrait(name), slots, stats };
    });

    const equipInventory: InventoryItemVM[] = [];
    const consumables: InventoryItemVM[] = [];
    for (const st of inventoryStacks(this.profile)) {
      const def = items[st.itemId];
      if (!def) continue;
      const vm: InventoryItemVM = { itemId: def.id, name: def.name, description: def.description, slot: def.slot, count: st.count };
      if (isEquip(def)) equipInventory.push(vm);
      else consumables.push(vm);
    }

    return {
      units,
      equipInventory,
      consumables,
      allocations: this.allocationsVM(),
      back: { id: "back", label: this.loadoutReturn === "result" ? "返回结算" : "返回标题" },
    };
  }

  private levelUpVM(lu: LevelUpResult): ResultLevelUpVM {
    const name = this.unitName(lu.progress.defId);
    return {
      portrait: this.unitPortrait(name),
      name,
      fromLevel: lu.fromLevel,
      toLevel: lu.toLevel,
      unlockedSkills: lu.unlockedSkills.map((s) => this.trySkillName(s)),
    };
  }

  private portraitForGlyph(glyph: string, name?: string): PortraitVM {
    return { glyph, faction: "player", name };
  }

  private tryUnit(defId: string): { name: string } | undefined {
    try {
      return this.deps.registry.unit(defId);
    } catch {
      return undefined;
    }
  }

  /** 单位名（缺注册表回退 defId）。 */
  private unitName(defId: string): string {
    return this.tryUnit(defId)?.name ?? defId;
  }

  /** 玩家单位立绘 token（圆盘 + 名字首字）。 */
  private unitPortrait(name: string): PortraitVM {
    return { glyph: name.slice(0, 1), faction: "player" };
  }

  /**
   * 单位属性行（等级成长 + 已加点 + 传入的装备加成）。与 buildBattleState 同一公式。
   * 加点面板传 [] 表示不含装备；整备界面传 equipBonusesFor(...) 表示含装备。
   */
  private composedStatRows(up: { defId: string; level: number; allocated: Partial<UnitStats> }, equipBonuses: StatBonus[]): StatRowVM[] {
    let composed: UnitStats | null = null;
    try {
      composed = composeUnitStats(
        this.deps.registry.unit(up.defId).stats,
        up.defId,
        up.level,
        this.deps.tables.progression.growth,
        up.allocated,
        equipBonuses
      );
    } catch {
      composed = null;
    }
    return ALLOCATABLE_STATS.map((s) => ({ key: s.key, label: s.label, value: composed ? composed[s.key] : 0 }));
  }
  private trySkillName(skillId: string): string {
    try {
      return this.deps.registry.skill(skillId).name;
    } catch {
      return skillId;
    }
  }
}
