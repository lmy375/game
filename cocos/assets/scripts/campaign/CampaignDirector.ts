// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 流程编排（引擎无关）：走剧情图，遇战斗节点用 game-meta 装配并交给战斗层，
 * 战斗结束算奖励/升级/存档，再展示结算并推进。镜像 BattleSession 的「状态机 + Host」模式。
 *
 * 跨战斗的真相在 game-meta；本类只编排「下一屏是什么」并驱动 CampaignHost。
 */
import { ContentRegistry, LevelDef, BattleState } from "../game-core/index";
import {
  PlayerProfile,
  SaveData,
  MetaTables,
  SaveStore,
  buildBattleState,
  computeRewards,
  applyRewards,
  nodeById,
  advance,
  StoryNode,
  CutsceneNode,
  LevelUpResult,
} from "../game-meta/index";
import {
  CampaignHost,
  TitleVM,
  CutsceneVM,
  PortraitVM,
  CutsceneLineVM,
  ResultLevelUpVM,
} from "./types";

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

  constructor(private readonly deps: CampaignDeps) {}

  // ---------- 启动 ----------
  /** 显示标题：有存档则「继续」可用。不自动续档。 */
  boot(): void {
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
  }

  toTitle(): void {
    this.boot();
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
        this.deps.host.startBattle(state, level, (outcome, finalState) =>
          this.onBattleEnd(battleNodeId, outcome, finalState)
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
      const { profile, levelUps } = applyRewards(this.profile, rewards, this.deps.tables);
      this.profile = profile;
      for (const itemId of rewards.itemDrops) this.autoEquip(itemId); // Demo：掉落装备自动穿上，下场可见效果

      const resultNodeId = advance(this.deps.tables.story, battleNodeId); // result 节点
      const afterResultId = resultNodeId ? advance(this.deps.tables.story, resultNodeId) : null;
      this.nodeId = afterResultId ?? battleNodeId;
      this.persist(); // 存档落在结算后的下一节点，刷新可从那里续

      const xpGained = Object.values(rewards.xpByDefId).reduce((a, b) => a + b, 0);
      this.pending = { kind: "win", battleNodeId };
      this.deps.host.showResult({
        win: true,
        title: "胜利",
        xpGained,
        levelUps: levelUps.map((lu) => this.levelUpVM(lu)),
        itemsGained: rewards.itemDrops.map((id) => {
          const it = this.deps.tables.items[id];
          return { name: it?.name ?? id, description: it?.description ?? "" };
        }),
        primary: { id: "advance", label: "继续" },
      });
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

  /** 把掉落的装备穿到第一个空装备位的单位（Demo 简化：无手动装备 UI）。 */
  private autoEquip(itemId: string): void {
    const it = this.deps.tables.items[itemId];
    if (!it || it.kind !== "equip") return;
    const slot = this.profile.units.find((u) => u.equipped === null);
    if (slot) {
      slot.equipped = itemId;
      const i = this.profile.inventory.indexOf(itemId);
      if (i >= 0) this.profile.inventory.splice(i, 1); // 穿上即从背包移除
    }
  }

  private persist(): void {
    this.profile.storyNodeId = this.nodeId;
    this.deps.store.save({ version: 1, profile: this.profile });
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

  private levelUpVM(lu: LevelUpResult): ResultLevelUpVM {
    const def = this.tryUnit(lu.progress.defId);
    const name = def?.name ?? lu.progress.defId;
    return {
      portrait: { glyph: name.slice(0, 1), faction: "player" },
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
  private trySkillName(skillId: string): string {
    try {
      return this.deps.registry.skill(skillId).name;
    } catch {
      return skillId;
    }
  }
}
