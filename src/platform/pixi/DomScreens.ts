/**
 * DOM 屏幕渲染器：把 campaign 的屏幕 ViewModel 渲染成 标题/过场/结算/结局 全屏覆盖层。镜像 DomHud 的形状。
 * 立绘优先用 AssetManifest 的图片，缺图时回退「圆盘 + 字形」纯 CSS。
 */
import { TitleVM, CutsceneVM, ResultVM, EndingVM, PortraitVM, LoadoutVM, StatAllocationVM, InventoryItemVM, StatBonusVM } from "../../campaign";
import { UnitStats } from "@core/index";
import { EquipSlot } from "@meta/index";
import { portraitUrlFor } from "./AssetManifest";

export interface ScreenHandlers {
  title(id: "new" | "continue" | "loadout"): void;
  cutsceneNext(): void;
  resultPrimary(): void;
  resultSecondary(): void;
  allocateStat(defId: string, stat: keyof UnitStats): void;
  endingToTitle(): void;
  equip(defId: string, itemId: string): void;
  unequip(defId: string, slot: EquipSlot): void;
  closeLoadout(): void;
}

/** 属性加成徽标（如「攻击 +4」）。 */
function bonusBadges(bonuses: StatBonusVM[]): string {
  return bonuses
    .map((b) => `<span class="lo-badge">${b.label} ${b.amount >= 0 ? "+" : ""}${b.amount}</span>`)
    .join("");
}

function portraitHtml(p: PortraitVM): string {
  const cls = p.role === "tank" ? "portrait-tank" : p.faction === "enemy" ? "portrait-enemy" : "portrait-player";
  const url = portraitUrlFor(p.name) ?? portraitUrlFor(p.glyph);
  if (url) return `<span class="portrait portrait-img ${cls}" style="background-image:url('${url}')"></span>`;
  return `<span class="portrait ${cls}">${p.glyph}</span>`;
}

export class DomScreens {
  /** 队伍界面：当前选中的角色 Tab（defId）。纯 UI 态。 */
  private loadoutTab: string | null = null;
  /** 队伍界面：当前展开选装的槽位（null=未展开）。纯 UI 态。 */
  private loadoutSlot: EquipSlot | null = null;
  /** 队伍界面：当前展开介绍的物品 id（null=无）。纯 UI 态。 */
  private loadoutItemDetail: string | null = null;

  constructor(private readonly root: HTMLElement, private readonly handlers: ScreenHandlers) {}

  private open(inner: string, screenClass = ""): void {
    // 复位「点任意处继续」——该处理器仅在过场屏挂载，切换到其它屏时必须清除，避免误触发。
    this.root.onclick = null;
    this.root.classList.remove("cutscene-active");
    this.root.innerHTML = `<div class="screen ${screenClass}">${inner}</div>`;
    this.root.classList.add("active");
    // 全屏剧情/结算屏幕期间隐藏战斗 HUD 骨架（顶栏/教学条/侧栏/底注），避免在没有战斗时露出。
    document.body.classList.add("screen-active");
  }

  hide(): void {
    this.root.onclick = null;
    this.root.classList.remove("active");
    this.root.classList.remove("cutscene-active");
    this.root.innerHTML = "";
    document.body.classList.remove("screen-active");
  }

  showTitle(vm: TitleVM): void {
    const sub = vm.subtitle ? `<p class="screen-sub">${vm.subtitle}</p>` : "";
    this.open(
      `<div class="title-shell">` +
        `<div class="title-copy">` +
          `<div class="title-kicker">ZHENQI · 阵棋</div>` +
          `<h1>${vm.title}</h1>` +
          `${sub}` +
          `<p class="title-flavor">焦土为局，一子未倒。</p>` +
        `</div>` +
        `<div class="title-menu">` +
          `<div class="title-menu-head"><span>作战指令</span></div>` +
          `<div class="btn-row">` +
        vm.buttons
          .map(
            (b) =>
              `<button class="screen-btn title-btn title-btn-${b.id}" data-id="${b.id}" ${b.enabled ? "" : "disabled"}>` +
              `<span>${b.label}</span></button>`
          )
          .join("") +
          `</div>` +
        `</div>` +
      `</div>`,
      "title-screen"
    );
    for (const b of vm.buttons) {
      const el = this.root.querySelector<HTMLButtonElement>(`button[data-id="${b.id}"]`);
      if (el && b.enabled) el.onclick = () => this.handlers.title(b.id);
    }
  }

  showCutscene(vm: CutsceneVM): void {
    const visible = vm.lines.slice(0, vm.cursor + 1);
    const linesHtml = visible
      .map((l) => {
        const por = l.portrait ? portraitHtml(l.portrait) : `<span class="portrait portrait-narr">…</span>`;
        const sp = l.speaker ? `<div class="cut-speaker">${l.speaker}</div>` : "";
        return `<div class="cutscene-line">${por}<div class="cut-body">${sp}<div class="cut-text">${l.text}</div></div></div>`;
      })
      .join("");
    this.open(
      `<div class="cutscene-lines">${linesHtml}</div>` +
        `<div class="btn-row"><button class="screen-btn" data-id="next">${vm.continueLabel}</button></div>`
    );
    // 剧情期间点屏幕任意位置即可继续（含遮罩背景与继续按钮，冒泡到 root 统一处理，只触发一次）。
    this.root.classList.add("cutscene-active");
    this.root.onclick = () => this.handlers.cutsceneNext();
  }

  showResult(vm: ResultVM): void {
    const xp = vm.win
      ? `<div class="result-xp"><span class="result-xp-label">获得经验</span><span class="result-xp-val">+${vm.xpGained}</span></div>`
      : "";
    const ups = vm.levelUps
      .map(
        (u) =>
          `<div class="result-card">${portraitHtml(u.portrait)}` +
          `<div class="result-card-body">` +
          `<div class="result-card-title"><span>${u.name}</span>` +
          `<span class="lvl-badge">Lv.${u.fromLevel}<i>→</i>Lv.${u.toLevel}</span></div>` +
          (u.unlockedSkills.length ? `<div class="result-card-sub">习得「${u.unlockedSkills.join("、")}」</div>` : "") +
          `</div></div>`
      )
      .join("");
    const upsSection = ups ? `<div class="result-section"><h2 class="result-h2">升级</h2><div class="result-list">${ups}</div></div>` : "";
    const items = vm.itemsGained
      .map(
        (it) =>
          `<div class="result-card loot-card"><span class="loot-icon">🎁</span>` +
          `<div class="result-card-body"><div class="result-card-title loot-name">${it.name}</div>` +
          `<div class="result-card-sub">${it.description}</div></div></div>`
      )
      .join("");
    const itemsSection = items
      ? `<div class="result-section"><h2 class="result-h2">战利品</h2><div class="result-list">${items}</div></div>`
      : "";
    const allocSection = this.allocHtml(vm.allocations);
    const secondary = vm.secondary
      ? `<button class="screen-btn screen-btn-secondary" data-id="secondary">${vm.secondary.label}</button>`
      : "";
    this.open(
      `<div class="result-head"><h1 class="${vm.win ? "win" : "lose"}">${vm.title}</h1>${xp}</div>` +
        `<div class="result-scroll">${upsSection}${itemsSection}${allocSection}</div>` +
        `<div class="btn-row">${secondary}<button class="screen-btn" data-id="primary">${vm.primary.label}</button></div>`,
      "result-screen"
    );
    const btn = this.root.querySelector<HTMLButtonElement>(`button[data-id="primary"]`);
    if (btn) btn.onclick = () => this.handlers.resultPrimary();
    const sec = this.root.querySelector<HTMLButtonElement>(`button[data-id="secondary"]`);
    if (sec) sec.onclick = () => this.handlers.resultSecondary();
    this.wireAllocButtons();
  }

  /** 加点面板 HTML（结算屏与整备屏共用）。无可分配单位时返回空串。 */
  private allocHtml(allocations: StatAllocationVM[] | undefined): string {
    const alloc = (allocations ?? [])
      .map((a) => {
        const spendable = a.unspentPoints > 0;
        const rows = a.stats
          .map(
            (s) =>
              `<div class="alloc-stat"><span class="alloc-label">${s.label}</span>` +
              `<span class="alloc-value">${s.value}</span>` +
              `<button class="alloc-btn" data-alloc="${a.defId}" data-stat="${s.key}"${spendable ? "" : " disabled"} aria-label="提升${s.label}">+</button></div>`
          )
          .join("");
        return (
          `<div class="alloc-panel"><div class="alloc-head">${portraitHtml(a.portrait)}` +
          `<span class="alloc-name">${a.name}</span>` +
          `<span class="alloc-points-badge${spendable ? " has-points" : ""}">可分配 <b>${a.unspentPoints}</b></span></div>` +
          `<div class="alloc-stats">${rows}</div></div>`
        );
      })
      .join("");
    return alloc
      ? `<div class="result-section alloc-body"><h2 class="result-h2">分配属性点</h2><div class="alloc-grid">${alloc}</div></div>`
      : "";
  }

  /** 绑定加点「+」按钮（结算屏与整备屏共用）。 */
  private wireAllocButtons(): void {
    this.root.querySelectorAll<HTMLButtonElement>("button.alloc-btn").forEach((b) => {
      b.onclick = () => {
        const defId = b.dataset.alloc;
        const stat = b.dataset.stat as keyof UnitStats | undefined;
        if (defId && stat) this.handlers.allocateStat(defId, stat);
      };
    });
  }

  /**
   * 队伍界面：顶部角色 Tab，切换后展示该角色的大立绘 / 属性 / 三个装备槽。
   * 交互：点某个槽 → 下方展开该槽可用装备，点装备即装上（槽位由物品决定）；已装槽可「卸下」。
   */
  showLoadout(vm: LoadoutVM): void {
    // 选中的 Tab 若已失效，回退到首个角色。
    if (!this.loadoutTab || !vm.units.some((u) => u.defId === this.loadoutTab)) {
      this.loadoutTab = vm.units[0]?.defId ?? null;
      this.loadoutSlot = null;
    }
    this.paintLoadout(vm);
  }

  private paintLoadout(vm: LoadoutVM): void {
    const active = vm.units.find((u) => u.defId === this.loadoutTab) ?? vm.units[0];

    // 顶部角色 Tab。
    const tabs = vm.units
      .map(
        (u) =>
          `<button class="lo-tab ${u.defId === active?.defId ? "active" : ""}" data-tab="${u.defId}">` +
          `${portraitHtml(u.portrait)}<span>${u.name}</span></button>`
      )
      .join("");

    const body = active ? this.loadoutUnitBody(vm, active) : `<div class="lo-empty">队伍暂无成员</div>`;

    const consList = vm.consumables.length
      ? vm.consumables.map((it) => this.itemRowHtml(it, false)).join("")
      : `<div class="lo-empty">背包无消耗品</div>`;

    this.open(
      `<h1>队伍</h1>` +
        `<div class="lo-tabs">${tabs}</div>` +
        `<div class="lo-body">${body}</div>` +
        `<div class="lo-cons"><h2 class="lo-subtitle">消耗品（战斗中使用）</h2><div class="lo-list">${consList}</div></div>` +
        `<div class="btn-row"><button class="screen-btn" data-id="back">${vm.back.label}</button></div>`
    );
    this.wireAllocButtons();

    // 切换角色 Tab。
    this.root.querySelectorAll<HTMLElement>("[data-tab]").forEach((el) => {
      el.onclick = () => {
        this.loadoutTab = el.dataset.tab!;
        this.loadoutSlot = null;
        this.loadoutItemDetail = null;
        this.paintLoadout(vm);
      };
    });
    // 点槽位：展开 / 收起该槽的选装列表。
    this.root.querySelectorAll<HTMLElement>("[data-slot-pick]").forEach((el) => {
      el.onclick = (ev) => {
        if ((ev.target as HTMLElement).closest("[data-unequip]")) return; // 卸下按钮单独处理
        const slot = el.dataset.slotPick as EquipSlot;
        this.loadoutSlot = this.loadoutSlot === slot ? null : slot;
        this.loadoutItemDetail = null;
        this.paintLoadout(vm);
      };
    });
    // 卸下已装槽。
    this.root.querySelectorAll<HTMLElement>("[data-unequip]").forEach((el) => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        const slot = el.dataset.slot as EquipSlot | undefined;
        if (active && slot) this.handlers.unequip(active.defId, slot);
      };
    });
    // 点物品行：展开 / 收起该物品的介绍与属性。
    this.root.querySelectorAll<HTMLElement>("[data-item]").forEach((el) => {
      el.onclick = (ev) => {
        if ((ev.target as HTMLElement).closest("[data-equip-item]")) return; // 装备按钮单独处理
        const id = el.dataset.item!;
        this.loadoutItemDetail = this.loadoutItemDetail === id ? null : id;
        this.paintLoadout(vm);
      };
    });
    // 从展开的详情里点「装备」装上当前角色当前槽。
    this.root.querySelectorAll<HTMLElement>("[data-equip-item]").forEach((el) => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        if (!active) return;
        this.loadoutSlot = null; // 装上后收起列表
        this.loadoutItemDetail = null;
        this.handlers.equip(active.defId, el.dataset.equipItem!);
      };
    });
    const back = this.root.querySelector<HTMLButtonElement>(`button[data-id="back"]`);
    if (back) back.onclick = () => this.handlers.closeLoadout();
  }

  /** 单个角色的详情：大立绘 + 属性(每属性一行) + 三个装备槽（+ 展开的选装列表）+ 该角色加点面板。 */
  private loadoutUnitBody(vm: LoadoutVM, u: LoadoutVM["units"][number]): string {
    const stats = u.stats
      .map((st) => `<div class="lo-statrow"><span class="lo-statname">${st.label}</span><span class="lo-statval">${st.value}</span></div>`)
      .join("");
    const slots = u.slots
      .map((s) => {
        const filled = !!s.item;
        const open = this.loadoutSlot === s.slot;
        const unequip = filled
          ? `<button class="lo-unequip" data-unequip="1" data-slot="${s.slot}" title="卸下">✕</button>`
          : "";
        const bonus = filled && s.item!.bonuses?.length ? `<span class="lo-slot-bonus">${bonusBadges(s.item!.bonuses)}</span>` : "";
        const body = filled ? `<b>${s.item!.name}</b>${bonus}` : `<span class="slot-empty">空</span>`;
        return (
          `<div class="lo-slot ${filled ? "filled" : ""} ${open ? "open" : ""}" data-slot-pick="${s.slot}">` +
          `<span class="slot-label">${s.label}</span>${body}${unequip}</div>`
        );
      })
      .join("");

    // 展开的选装列表：背包里匹配当前槽位的装备。
    let picker = "";
    if (this.loadoutSlot) {
      const label = u.slots.find((s) => s.slot === this.loadoutSlot)?.label ?? "装备";
      const options = vm.equipInventory.filter((it) => it.slot === this.loadoutSlot);
      const list = options.length
        ? options.map((it) => this.itemRowHtml(it, true)).join("")
        : `<div class="lo-empty">背包无可用${label}</div>`;
      picker = `<div class="lo-picker"><h2 class="lo-subtitle">选择${label}（点物品看详情）</h2><div class="lo-list">${list}</div></div>`;
    }

    const alloc = this.allocHtml((vm.allocations ?? []).filter((a) => a.defId === u.defId));

    return (
      `<div class="lo-unit-detail">` +
      `<div class="lo-hero">${portraitHtml(u.portrait)}<div class="lo-hero-info"><div class="lo-name">${u.name}</div><div class="lo-statlist">${stats}</div></div></div>` +
      `<div class="lo-slots">${slots}</div>${picker}${alloc}` +
      `</div>`
    );
  }

  /**
   * 背包物品一行：名字 + 数量 + 属性徽标；点击展开介绍。
   * equippable=true 的装备在展开区提供「装备」按钮。
   */
  private itemRowHtml(it: InventoryItemVM, equippable: boolean): string {
    const open = this.loadoutItemDetail === it.itemId;
    const icon = equippable ? "" : `<span class="item-icon">🧪</span>`;
    const count = it.count > 1 ? `<small>×${it.count}</small>` : "";
    const badges = it.bonuses?.length ? `<span class="lo-badges">${bonusBadges(it.bonuses)}</span>` : "";
    let detail = "";
    if (open) {
      const btn = equippable ? `<button class="lo-equip-btn" data-equip-item="${it.itemId}">装备</button>` : "";
      detail = `<div class="lo-item-detail"><p class="lo-desc">${it.description}</p>${btn}</div>`;
    }
    return (
      `<div class="lo-item ${open ? "open" : ""}" data-item="${it.itemId}">` +
      `<div class="lo-item-head">${icon}<b>${it.name}</b> ${count}${badges}<span class="lo-item-caret">${open ? "▴" : "▾"}</span></div>` +
      `${detail}</div>`
    );
  }

  showEnding(vm: EndingVM): void {
    const lines = vm.lines.map((l) => `<p class="ending-line">${l}</p>`).join("");
    this.open(
      `<h1>${vm.title}</h1><div class="ending-body">${lines}</div>` +
        `<div class="btn-row">` +
        vm.buttons.map((b) => `<button class="screen-btn" data-id="${b.id}">${b.label}</button>`).join("") +
        `</div>`
    );
    const btn = this.root.querySelector<HTMLButtonElement>(`button[data-id="toTitle"]`);
    if (btn) btn.onclick = () => this.handlers.endingToTitle();
  }
}
