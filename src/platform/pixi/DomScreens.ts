/**
 * DOM 屏幕渲染器：把 campaign 的屏幕 ViewModel 渲染成 标题/过场/结算/结局 全屏覆盖层。镜像 DomHud 的形状。
 * 立绘优先用 AssetManifest 的图片，缺图时回退「圆盘 + 字形」纯 CSS。
 */
import { TitleVM, CutsceneVM, ResultVM, EndingVM, PortraitVM, LoadoutVM, InventoryItemVM, StatBonusVM, RarityVM } from "../../campaign";
import { EquipSlot } from "@meta/index";
import { portraitUrlFor } from "./AssetManifest";

export interface ScreenHandlers {
  title(id: "new" | "continue" | "loadout"): void;
  cutsceneNext(): void;
  cutsceneSkip(): void;
  resultPrimary(): void;
  resultSecondary(): void;
  endingToTitle(): void;
  equip(defId: string, itemId: string): void;
  unequip(defId: string, slot: EquipSlot): void;
  equipSkill(defId: string, itemId: string, slotIndex: number): void;
  unequipSkill(defId: string, slotIndex: number): void;
  closeLoadout(): void;
}

/** 稀有度小标签（配色由 rarity-<tier> class 决定）。 */
function rarityTag(r: RarityVM): string {
  return `<span class="rarity-tag rarity-${r.tier}">${r.label}</span>`;
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
  /** 队伍界面：当前展开选装的装备槽位（null=未展开）。纯 UI 态。 */
  private loadoutSlot: EquipSlot | null = null;
  /** 队伍界面：当前展开选装的技能栏格（null=未展开）。与装备槽互斥。纯 UI 态。 */
  private loadoutSkillSlot: number | null = null;
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
      `<button class="cutscene-skip" data-id="skip">${vm.skipLabel} ≫</button>` +
        `<div class="cutscene-lines">${linesHtml}</div>` +
        `<div class="btn-row"><button class="screen-btn" data-id="next">${vm.continueLabel}</button></div>`
    );
    // 剧情期间点屏幕任意位置即可继续（含遮罩背景与继续按钮，冒泡到 root 统一处理，只触发一次）。
    this.root.classList.add("cutscene-active");
    this.root.onclick = () => this.handlers.cutsceneNext();
    // 「跳过」独立于「点任意处继续」：阻止冒泡，避免同一次点击又触发一次推进。
    const skip = this.root.querySelector<HTMLButtonElement>(`button[data-id="skip"]`);
    if (skip)
      skip.onclick = (ev) => {
        ev.stopPropagation();
        this.handlers.cutsceneSkip();
      };
  }

  showResult(vm: ResultVM): void {
    const items = vm.itemsGained
      .map((it) => {
        const equipped = it.equippedTo ? `<span class="loot-equipped">已装备给 ${it.equippedTo}</span>` : "";
        return (
          `<div class="result-card loot-card rarity-border-${it.rarity.tier}"><span class="loot-icon">🎁</span>` +
          `<div class="result-card-body"><div class="result-card-title loot-name"><span class="rarity-${it.rarity.tier}">${it.name}</span>${rarityTag(it.rarity)}${equipped}</div>` +
          `<div class="result-card-sub">${it.description}</div></div></div>`
        );
      })
      .join("");
    const itemsSection = items
      ? `<div class="result-section"><h2 class="result-h2">战利品</h2><div class="result-list">${items}</div></div>`
      : "";
    const secondary = vm.secondary
      ? `<button class="screen-btn screen-btn-secondary" data-id="secondary">${vm.secondary.label}</button>`
      : "";
    this.open(
      `<div class="result-head"><h1 class="${vm.win ? "win" : "lose"}">${vm.title}</h1></div>` +
        `<div class="result-scroll">${itemsSection}</div>` +
        `<div class="btn-row">${secondary}<button class="screen-btn" data-id="primary">${vm.primary.label}</button></div>`,
      "result-screen"
    );
    const btn = this.root.querySelector<HTMLButtonElement>(`button[data-id="primary"]`);
    if (btn) btn.onclick = () => this.handlers.resultPrimary();
    const sec = this.root.querySelector<HTMLButtonElement>(`button[data-id="secondary"]`);
    if (sec) sec.onclick = () => this.handlers.resultSecondary();
  }

  /**
   * 队伍界面：顶部角色 Tab，切换后展示该角色的大立绘 / 属性 / 三个装备槽 / 五格技能栏。
   * 交互：点某个槽 → 下方展开该槽可用装备/技能，点物品即装上；已装槽可「卸下」。
   */
  showLoadout(vm: LoadoutVM): void {
    // 选中的 Tab 若已失效，回退到首个角色。
    if (!this.loadoutTab || !vm.units.some((u) => u.defId === this.loadoutTab)) {
      this.loadoutTab = vm.units[0]?.defId ?? null;
      this.loadoutSlot = null;
      this.loadoutSkillSlot = null;
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
      ? vm.consumables.map((it) => this.itemRowHtml(it, "none")).join("")
      : `<div class="lo-empty">背包无消耗品</div>`;

    this.open(
      `<h1>队伍</h1>` +
        `<div class="lo-tabs">${tabs}</div>` +
        `<div class="lo-body">${body}</div>` +
        `<div class="lo-cons"><h2 class="lo-subtitle">消耗品（战斗中使用）</h2><div class="lo-list">${consList}</div></div>` +
        `<div class="btn-row"><button class="screen-btn" data-id="back">${vm.back.label}</button></div>`
    );

    // 切换角色 Tab。
    this.root.querySelectorAll<HTMLElement>("[data-tab]").forEach((el) => {
      el.onclick = () => {
        this.loadoutTab = el.dataset.tab!;
        this.loadoutSlot = null;
        this.loadoutSkillSlot = null;
        this.loadoutItemDetail = null;
        this.paintLoadout(vm);
      };
    });
    // 点装备槽位：展开 / 收起该槽的选装列表（与技能栏互斥）。
    this.root.querySelectorAll<HTMLElement>("[data-slot-pick]").forEach((el) => {
      el.onclick = (ev) => {
        if ((ev.target as HTMLElement).closest("[data-unequip]")) return; // 卸下按钮单独处理
        const slot = el.dataset.slotPick as EquipSlot;
        this.loadoutSlot = this.loadoutSlot === slot ? null : slot;
        this.loadoutSkillSlot = null;
        this.loadoutItemDetail = null;
        this.paintLoadout(vm);
      };
    });
    // 点技能栏格：展开 / 收起技能选装列表（与装备槽互斥）。
    this.root.querySelectorAll<HTMLElement>("[data-skillslot-pick]").forEach((el) => {
      el.onclick = (ev) => {
        if ((ev.target as HTMLElement).closest("[data-unequip-skill]")) return; // 卸下按钮单独处理
        const idx = Number(el.dataset.skillslotPick);
        this.loadoutSkillSlot = this.loadoutSkillSlot === idx ? null : idx;
        this.loadoutSlot = null;
        this.loadoutItemDetail = null;
        this.paintLoadout(vm);
      };
    });
    // 卸下已装装备槽。
    this.root.querySelectorAll<HTMLElement>("[data-unequip]").forEach((el) => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        const slot = el.dataset.slot as EquipSlot | undefined;
        if (active && slot) this.handlers.unequip(active.defId, slot);
      };
    });
    // 卸下技能栏某格。
    this.root.querySelectorAll<HTMLElement>("[data-unequip-skill]").forEach((el) => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        if (active) this.handlers.unequipSkill(active.defId, Number(el.dataset.unequipSkill));
      };
    });
    // 点物品行：展开 / 收起该物品的介绍与属性。
    this.root.querySelectorAll<HTMLElement>("[data-item]").forEach((el) => {
      el.onclick = (ev) => {
        if ((ev.target as HTMLElement).closest("[data-equip-item],[data-equip-skill-item]")) return; // 装备按钮单独处理
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
    // 从展开的详情里点「装备」把技能秘卷装入当前展开的技能栏格。
    this.root.querySelectorAll<HTMLElement>("[data-equip-skill-item]").forEach((el) => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        if (!active || this.loadoutSkillSlot === null) return;
        const slotIndex = this.loadoutSkillSlot;
        this.loadoutSkillSlot = null; // 装上后收起列表
        this.loadoutItemDetail = null;
        this.handlers.equipSkill(active.defId, el.dataset.equipSkillItem!, slotIndex);
      };
    });
    const back = this.root.querySelector<HTMLButtonElement>(`button[data-id="back"]`);
    if (back) back.onclick = () => this.handlers.closeLoadout();
  }

  /** 单个角色的详情：大立绘 + 属性(每属性一行) + 三个装备槽 + 五格技能栏（+ 展开的选装列表）。 */
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
        const body = filled
          ? `<b class="rarity-${s.item!.rarity.tier}">${s.item!.name}</b>${bonus}`
          : `<span class="slot-empty">空</span>`;
        const rarityCls = filled ? `rarity-border-${s.item!.rarity.tier}` : "";
        return (
          `<div class="lo-slot ${filled ? "filled" : ""} ${rarityCls} ${open ? "open" : ""}" data-slot-pick="${s.slot}">` +
          `<span class="slot-label">${s.label}</span>${body}${unequip}</div>`
        );
      })
      .join("");

    const skillSlots = u.skillSlots
      .map((s) => {
        const filled = !!s.item;
        const open = this.loadoutSkillSlot === s.index;
        const unequip = filled
          ? `<button class="lo-unequip" data-unequip-skill="${s.index}" title="卸下">✕</button>`
          : "";
        const body = filled
          ? `<b class="rarity-${s.item!.rarity.tier}">${s.item!.name}</b>`
          : `<span class="slot-empty">空</span>`;
        const rarityCls = filled ? `rarity-border-${s.item!.rarity.tier}` : "";
        return (
          `<div class="lo-slot lo-skillslot ${filled ? "filled" : ""} ${rarityCls} ${open ? "open" : ""}" data-skillslot-pick="${s.index}">` +
          `<span class="slot-label">技能 ${s.index + 1}</span>${body}${unequip}</div>`
        );
      })
      .join("");

    // 展开的选装列表：背包里匹配当前装备槽位的装备，或当前角色可用的技能秘卷。
    let picker = "";
    if (this.loadoutSlot) {
      const label = u.slots.find((s) => s.slot === this.loadoutSlot)?.label ?? "装备";
      const options = vm.equipInventory.filter((it) => it.slot === this.loadoutSlot);
      const list = options.length
        ? options.map((it) => this.itemRowHtml(it, "equip")).join("")
        : `<div class="lo-empty">背包无可用${label}</div>`;
      picker = `<div class="lo-picker"><h2 class="lo-subtitle">选择${label}（点物品看详情）</h2><div class="lo-list">${list}</div></div>`;
    } else if (this.loadoutSkillSlot !== null) {
      const options = vm.skillInventory.filter((it) => it.usableBy?.includes(u.defId));
      const list = options.length
        ? options.map((it) => this.itemRowHtml(it, "skill")).join("")
        : `<div class="lo-empty">背包无 ${u.name} 可用的技能秘卷</div>`;
      picker = `<div class="lo-picker"><h2 class="lo-subtitle">选择技能秘卷（点物品看详情）</h2><div class="lo-list">${list}</div></div>`;
    }

    return (
      `<div class="lo-unit-detail">` +
      `<div class="lo-hero">${portraitHtml(u.portrait)}<div class="lo-hero-info"><div class="lo-name">${u.name}</div><div class="lo-statlist">${stats}</div></div></div>` +
      `<div class="lo-slots">${slots}</div>` +
      `<h2 class="lo-subtitle">技能栏</h2><div class="lo-slots lo-skillslots">${skillSlots}</div>${picker}` +
      `</div>`
    );
  }

  /**
   * 背包物品一行：名字 + 数量 + 属性徽标；点击展开介绍。
   * mode="equip"/"skill" 时在展开区提供「装备」按钮（分别装入装备槽 / 技能栏）。
   */
  private itemRowHtml(it: InventoryItemVM, mode: "equip" | "skill" | "none"): string {
    const open = this.loadoutItemDetail === it.itemId;
    const icon = mode === "none" ? `<span class="item-icon">🧪</span>` : mode === "skill" ? `<span class="item-icon">📜</span>` : "";
    const count = it.count > 1 ? `<small>×${it.count}</small>` : "";
    const badges = it.bonuses?.length ? `<span class="lo-badges">${bonusBadges(it.bonuses)}</span>` : "";
    let detail = "";
    if (open) {
      const btn =
        mode === "equip"
          ? `<button class="lo-equip-btn" data-equip-item="${it.itemId}">装备</button>`
          : mode === "skill"
            ? `<button class="lo-equip-btn" data-equip-skill-item="${it.itemId}">装备</button>`
            : "";
      detail = `<div class="lo-item-detail"><p class="lo-desc">${it.description}</p>${btn}</div>`;
    }
    return (
      `<div class="lo-item rarity-border-${it.rarity.tier} ${open ? "open" : ""}" data-item="${it.itemId}">` +
      `<div class="lo-item-head">${icon}<b class="rarity-${it.rarity.tier}">${it.name}</b>${rarityTag(it.rarity)} ${count}${badges}<span class="lo-item-caret">${open ? "▴" : "▾"}</span></div>` +
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
