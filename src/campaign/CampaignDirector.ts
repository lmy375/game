/**
 * 流程编排（引擎无关）：走剧情图，遇战斗节点用 game-meta 装配并交给战斗层，
 * 战斗结束算奖励（掉落/技能秘卷自动装备）/存档，再展示结算并推进。镜像 BattleSession 的「状态机 + Host」模式。
 *
 * 跨战斗的真相在 game-meta；本类只编排「下一屏是什么」并驱动 CampaignHost。
 */
import { ContentRegistry, LevelDef, BattleState, UnitStats } from "@core/index";
import {
  PlayerProfile,
  SaveData,
  SAVE_VERSION,
  MetaTables,
  SaveStore,
  buildBattleState,
  computeRewards,
  applyRewards,
  composeUnitStats,
  nodeById,
  advance,
  StoryNode,
  CutsceneNode,
  EquipSlot,
  EQUIP_SLOTS,
  ItemTable,
  StatBonus,
  isEquip,
  isConsumable,
  isSkillItem,
  equipBonusesFor,
  equipItem,
  unequipItem,
  equipSkillItem,
  unequipSkillItem,
  consumeItem,
  inventoryStacks,
  AutoEquipRecord,
} from "@meta/index";
import { BattleItem, UnitStatPatch } from "../interaction";
import {
  CampaignHost,
  TitleVM,
  CutsceneVM,
  PortraitVM,
  CutsceneLineVM,
  ResultItemVM,
  ResultVM,
  StatRowVM,
  LoadoutVM,
  LoadoutUnitVM,
  LoadoutSlotVM,
  SkillSlotVM,
  InventoryItemVM,
  StatBonusVM,
} from "./types";

/** 整备界面属性预览展示的属性（不含 moveRange，与装备加成可影响的主属性一致）。 */
const PREVIEW_STATS: { key: keyof UnitStats; label: string }[] = [
  { key: "hp", label: "生命" },
  { key: "attack", label: "攻击" },
  { key: "magic", label: "魔力" },
  { key: "defense", label: "防御" },
  { key: "speed", label: "速度" },
];

/** 装备槽位中文名。 */
const SLOT_LABELS: Record<EquipSlot, string> = { weapon: "武器", armor: "护甲", accessory: "饰品" };

/** 属性中文名（用于装备加成展示；含 moveRange 兜底）。 */
const STAT_LABELS: Partial<Record<keyof UnitStats, string>> = {
  hp: "生命",
  attack: "攻击",
  magic: "魔力",
  defense: "防御",
  speed: "速度",
  moveRange: "移动",
};

/** 装备属性加成 → 展示 VM（如 attack+4 → {label:"攻击", amount:4}）。 */
function bonusVMs(bonus?: StatBonus[]): StatBonusVM[] | undefined {
  if (!bonus?.length) return undefined;
  return bonus.map((b) => ({ label: STAT_LABELS[b.stat] ?? b.stat, amount: b.amount }));
}

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
  /** 胜利结算屏的静态部分（从整备返回时重渲染，故缓存）。 */
  private lastWin: { itemsGained: ResultItemVM[] } | null = null;
  /** 整备界面的返回目标（从标题、结算屏或战斗中的「休整」进入）。 */
  private loadoutReturn: "title" | "result" | "battle" = "title";

  constructor(private readonly deps: CampaignDeps) {}

  // ---------- 启动 ----------
  /** 显示标题：有存档则「继续」可用。不自动续档。 */
  boot(): void {
    const saved = this.deps.store.load();
    const start = nodeById(this.deps.tables.story, this.deps.tables.story.startId);
    this.profile = this.deps.newSave().profile;
    this.nodeId = this.deps.tables.story.startId;
    this.deps.host.showTitle(this.titleVM(start.kind === "title" ? start.title : "阵棋", !!saved, start));
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

  toTitle(): void {
    this.boot();
  }

  // ---------- 整备界面 ----------
  /** 打开整备。从标题进入时若有存档则载入该档编辑（改动落到进行中的游戏）。 */
  openLoadout(from: "title" | "result" | "battle" = "title"): void {
    this.loadoutReturn = from;
    if (from === "title") {
      const saved = this.deps.store.load();
      if (saved) {
        this.profile = saved.profile;
        this.nodeId = saved.profile.storyNodeId;
      }
    }
    this.deps.host.showLoadout(this.loadoutVM());
  }

  /** 关闭整备，回到来源屏（结算/标题/战斗）。战斗中休整：把重算的属性回写进行中的战斗。 */
  closeLoadout(): void {
    if (this.loadoutReturn === "battle") {
      this.deps.host.hideScreens();
      this.deps.host.updateBattleUnitStats(this.playerStatPatches());
    } else if (this.loadoutReturn === "result") {
      this.showWinResult();
    } else {
      this.boot();
    }
  }

  /** 按档案重算全部我方单位的最终属性（基础值 + 装备），与 buildBattleState 同一公式。 */
  private playerStatPatches(): UnitStatPatch[] {
    const patches: UnitStatPatch[] = [];
    for (const up of this.profile.units) {
      const def = this.tryUnit(up.defId);
      if (!def) continue;
      const stats = composeUnitStats(def.stats, equipBonusesFor(up.equipped, this.deps.tables.items));
      patches.push({ defId: up.defId, stats, maxHp: stats.hp });
    }
    return patches;
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

  /** 给某单位技能栏装上背包里的一件技能道具（slotIndex 缺省=第一个空格；指定且被占用=替换）。 */
  doEquipSkill(defId: string, itemId: string, slotIndex?: number): void {
    this.profile = equipSkillItem(this.profile, defId, itemId, this.deps.tables.items, slotIndex);
    this.persist();
    this.deps.host.showLoadout(this.loadoutVM());
  }

  /** 卸下某单位技能栏某格的技能道具（退回背包）。 */
  doUnequipSkill(defId: string, slotIndex: number): void {
    this.profile = unequipSkillItem(this.profile, defId, slotIndex);
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
        this.deps.host.startBattle(state, level, {
          onEnd: (outcome, finalState) => this.onBattleEnd(battleNodeId, outcome, finalState),
          battleItems: this.battleConsumables(),
          onItemConsumed: (itemId) => {
            this.profile = consumeItem(this.profile, itemId);
            this.persist();
          },
          onOpenLoadout: () => this.openLoadout("battle"),
        });
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
      const { profile, autoEquipped } = applyRewards(this.profile, rewards, this.deps.tables.items);
      this.profile = profile; // 掉落入背包；技能秘卷已自动装备，其余在整备界面手动处理

      const resultNodeId = advance(this.deps.tables.story, battleNodeId); // result 节点
      const afterResultId = resultNodeId ? advance(this.deps.tables.story, resultNodeId) : null;
      this.nodeId = afterResultId ?? battleNodeId;
      this.persist(); // 存档落在结算后的下一节点，刷新可从那里续

      this.pending = { kind: "win", battleNodeId };
      this.lastWin = { itemsGained: this.itemsGainedVM(rewards.itemDrops, autoEquipped) };
      this.showWinResult();
    } else {
      this.pending = { kind: "lose", battleNodeId };
      this.deps.host.showResult({
        win: false,
        title: "战败",
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
    this.deps.store.save({ version: SAVE_VERSION, profile: this.profile });
  }

  /** 掉落物 → 结算屏战利品 VM（技能秘卷标注接收单位）。 */
  private itemsGainedVM(itemDrops: string[], autoEquipped: AutoEquipRecord[]): ResultItemVM[] {
    // 同 id 掉多份时逐份消费装备记录（如两份破甲刺秘卷分别装给剑客与枪兵）。
    const pendingByItem = new Map<string, string[]>();
    for (const rec of autoEquipped) {
      const list = pendingByItem.get(rec.itemId) ?? [];
      list.push(rec.defId);
      pendingByItem.set(rec.itemId, list);
    }
    return itemDrops.map((id) => {
      const it = this.deps.tables.items[id];
      const equippedDefId = pendingByItem.get(id)?.shift();
      return {
        name: it?.name ?? id,
        description: it?.description ?? "",
        equippedTo: equippedDefId ? this.unitName(equippedDefId) : undefined,
      };
    });
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
        { id: "loadout", label: "队伍", enabled: true },
      ],
    };
  }

  private cutsceneVM(node: CutsceneNode): CutsceneVM {
    const lines: CutsceneLineVM[] = node.lines.map((l) => ({
      speaker: l.speaker,
      text: l.text,
      portrait: l.glyph ? this.portraitForGlyph(l.glyph, l.speaker) : undefined,
    }));
    return { nodeId: node.id, lines, cursor: this.cursor, continueLabel: "点击任意位置继续", skipLabel: "跳过" };
  }

  /** 用缓存的静态部分重渲染胜利结算屏（从整备返回时复用）。 */
  private showWinResult(): void {
    if (!this.lastWin) return;
    const vm: ResultVM = {
      win: true,
      title: "胜利",
      itemsGained: this.lastWin.itemsGained,
      primary: { id: "advance", label: "继续" },
      secondary: { id: "loadout", label: "队伍" },
    };
    this.deps.host.showResult(vm);
  }

  /** 构建整备界面 VM：各单位三装备槽 + 技能栏 + 属性预览（含装备加成），背包按装备/技能/消耗品分列。 */
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
          item: it ? { itemId: it.id, name: it.name, description: it.description, bonuses: bonusVMs(it.bonus) } : undefined,
        };
      });
      const skillSlots: SkillSlotVM[] = up.skillSlots.map((id, index) => {
        const it = id ? items[id] : undefined;
        return {
          index,
          item: it ? { itemId: it.id, name: it.name, description: it.description } : undefined,
        };
      });
      // 属性预览含装备加成。
      const stats = this.composedStatRows(up, equipBonusesFor(up.equipped, items));
      return { defId: up.defId, name, portrait: this.unitPortrait(name), slots, skillSlots, stats };
    });

    const equipInventory: InventoryItemVM[] = [];
    const skillInventory: InventoryItemVM[] = [];
    const consumables: InventoryItemVM[] = [];
    for (const st of inventoryStacks(this.profile)) {
      const def = items[st.itemId];
      if (!def) continue;
      const vm: InventoryItemVM = {
        itemId: def.id,
        name: def.name,
        description: def.description,
        slot: def.slot,
        bonuses: bonusVMs(def.bonus),
        usableBy: def.usableBy,
        count: st.count,
      };
      if (isEquip(def)) equipInventory.push(vm);
      else if (isSkillItem(def)) skillInventory.push(vm);
      else consumables.push(vm);
    }

    return {
      units,
      equipInventory,
      skillInventory,
      consumables,
      back: {
        id: "back",
        label:
          this.loadoutReturn === "battle" ? "返回战斗" : this.loadoutReturn === "result" ? "返回结算" : "返回标题",
      },
    };
  }

  private portraitForGlyph(glyph: string, name?: string): PortraitVM {
    return { glyph, faction: "player", name };
  }

  private tryUnit(defId: string): { name: string; stats: UnitStats } | undefined {
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

  /** 单位属性行（基础值 + 传入的装备加成）。与 buildBattleState 同一公式。 */
  private composedStatRows(up: { defId: string }, equipBonuses: StatBonus[]): StatRowVM[] {
    const base = this.tryUnit(up.defId)?.stats;
    const composed = base ? composeUnitStats(base, equipBonuses) : null;
    return PREVIEW_STATS.map((s) => ({ key: s.key, label: s.label, value: composed ? composed[s.key] : 0 }));
  }
}
