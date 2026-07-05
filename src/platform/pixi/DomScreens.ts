/**
 * DOM 屏幕渲染器：把 campaign 的屏幕 ViewModel 渲染成 标题/过场/结算/结局 全屏覆盖层。镜像 DomHud 的形状。
 * 立绘优先用 AssetManifest 的图片，缺图时回退「圆盘 + 字形」纯 CSS。
 */
import { TitleVM, CutsceneVM, ResultVM, EndingVM, PortraitVM, LoadoutVM, StatAllocationVM } from "../../campaign";
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

function portraitHtml(p: PortraitVM): string {
  const cls = p.role === "tank" ? "portrait-tank" : p.faction === "enemy" ? "portrait-enemy" : "portrait-player";
  const url = portraitUrlFor(p.name) ?? portraitUrlFor(p.glyph);
  if (url) return `<span class="portrait portrait-img ${cls}" style="background-image:url('${url}')"></span>`;
  return `<span class="portrait ${cls}">${p.glyph}</span>`;
}

export class DomScreens {
  /** 整备界面：当前选中的背包装备 id（选中后点单位卡即装上）。纯 UI 态。 */
  private selectedEquipId: string | null = null;

  constructor(private readonly root: HTMLElement, private readonly handlers: ScreenHandlers) {}

  private open(inner: string): void {
    this.root.innerHTML = `<div class="screen">${inner}</div>`;
    this.root.classList.add("active");
    // 全屏剧情/结算屏幕期间隐藏战斗 HUD 骨架（顶栏/教学条/侧栏/底注），避免在没有战斗时露出。
    document.body.classList.add("screen-active");
  }

  hide(): void {
    this.root.classList.remove("active");
    this.root.innerHTML = "";
    document.body.classList.remove("screen-active");
  }

  showTitle(vm: TitleVM): void {
    const sub = vm.subtitle ? `<p class="screen-sub">${vm.subtitle}</p>` : "";
    this.open(
      `<h1>${vm.title}</h1>${sub}<div class="btn-row">` +
        vm.buttons
          .map(
            (b) =>
              `<button class="screen-btn" data-id="${b.id}" ${b.enabled ? "" : "disabled"}>${b.label}</button>`
          )
          .join("") +
        `</div>`
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
    const next = this.root.querySelector<HTMLButtonElement>(`button[data-id="next"]`);
    if (next) next.onclick = () => this.handlers.cutsceneNext();
  }

  showResult(vm: ResultVM): void {
    const xp = vm.win ? `<p class="result-xp">获得经验 +${vm.xpGained}</p>` : "";
    const ups = vm.levelUps
      .map(
        (u) =>
          `<div class="result-row">${portraitHtml(u.portrait)}<span>${u.name} 升级 Lv.${u.fromLevel} → Lv.${u.toLevel}` +
          (u.unlockedSkills.length ? `　习得「${u.unlockedSkills.join("、")}」` : "") +
          `</span></div>`
      )
      .join("");
    const items = vm.itemsGained
      .map((it) => `<div class="result-row"><span class="loot">🎁 ${it.name}</span><small>${it.description}</small></div>`)
      .join("");
    const allocSection = this.allocHtml(vm.allocations);
    const secondary = vm.secondary
      ? `<button class="screen-btn screen-btn-secondary" data-id="secondary">${vm.secondary.label}</button>`
      : "";
    this.open(
      `<h1 class="${vm.win ? "win" : "lose"}">${vm.title}</h1>${xp}` +
        `<div class="result-body">${ups}${items}</div>${allocSection}` +
        `<div class="btn-row">${secondary}<button class="screen-btn" data-id="primary">${vm.primary.label}</button></div>`
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
        const rows = a.stats
          .map(
            (s) =>
              `<div class="alloc-stat"><span class="alloc-label">${s.label}</span>` +
              `<span class="alloc-value">${s.value}</span>` +
              `<button class="alloc-btn" data-alloc="${a.defId}" data-stat="${s.key}"${a.unspentPoints > 0 ? "" : " disabled"}>+</button></div>`
          )
          .join("");
        return (
          `<div class="alloc-panel"><div class="alloc-head">${portraitHtml(a.portrait)}` +
          `<span>${a.name}　可分配点数 <b class="alloc-points">${a.unspentPoints}</b></span></div>` +
          `<div class="alloc-stats">${rows}</div></div>`
        );
      })
      .join("");
    return alloc ? `<div class="alloc-body"><h2 class="alloc-title">分配属性点</h2>${alloc}</div>` : "";
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
   * 整备界面：左列单位（三槽 + 属性预览），右列背包（装备可穿 / 消耗品只读）。
   * 交互：点右侧装备选中 → 点左侧单位卡装上（槽位由物品决定）；点已装槽卸下。
   */
  showLoadout(vm: LoadoutVM): void {
    // 选中的装备若已不在背包（已被装上），清空选中。
    if (this.selectedEquipId && !vm.equipInventory.some((i) => i.itemId === this.selectedEquipId)) {
      this.selectedEquipId = null;
    }
    this.paintLoadout(vm);
  }

  private paintLoadout(vm: LoadoutVM): void {
    const selecting = this.selectedEquipId !== null;
    const unitCards = vm.units
      .map((u) => {
        const slots = u.slots
          .map((s) => {
            const filled = !!s.item;
            const body = filled
              ? `<b>${s.item!.name}</b>`
              : `<span class="slot-empty">空</span>`;
            return (
              `<div class="lo-slot ${filled ? "filled" : ""}" data-unequip="${filled ? u.defId : ""}" data-slot="${s.slot}" title="${filled ? s.item!.description : ""}">` +
              `<span class="slot-label">${s.label}</span>${body}</div>`
            );
          })
          .join("");
        const stats = u.stats.map((st) => `<span class="lo-stat">${st.label} ${st.value}</span>`).join("");
        return (
          `<div class="lo-unit ${selecting ? "equippable" : ""}" data-equip-unit="${u.defId}">` +
          `<div class="lo-unit-head">${portraitHtml(u.portrait)}<span class="lo-name">${u.name}</span></div>` +
          `<div class="lo-slots">${slots}</div><div class="lo-stats">${stats}</div></div>`
        );
      })
      .join("");

    const equipList = vm.equipInventory.length
      ? vm.equipInventory
          .map(
            (it) =>
              `<div class="lo-item ${this.selectedEquipId === it.itemId ? "sel" : ""}" data-pick="${it.itemId}" title="${it.description}">` +
              `<b>${it.name}</b> <small>${it.count > 1 ? "×" + it.count : ""}</small></div>`
          )
          .join("")
      : `<div class="lo-empty">背包无装备</div>`;
    const consList = vm.consumables.length
      ? vm.consumables
          .map(
            (it) =>
              `<div class="lo-item readonly" title="${it.description}"><span class="item-icon">🧪</span><b>${it.name}</b> <small>×${it.count}</small></div>`
          )
          .join("")
      : `<div class="lo-empty">背包无消耗品</div>`;

    this.open(
      `<h1>整备</h1>` +
        `<div class="loadout">` +
        `<div class="lo-col lo-units">${unitCards}</div>` +
        `<div class="lo-col lo-bag">` +
        `<h2 class="lo-subtitle">装备${selecting ? "（点单位装上）" : ""}</h2><div class="lo-list">${equipList}</div>` +
        `<h2 class="lo-subtitle">消耗品（战斗中使用）</h2><div class="lo-list">${consList}</div>` +
        `</div></div>` +
        this.allocHtml(vm.allocations) +
        `<div class="btn-row"><button class="screen-btn" data-id="back">${vm.back.label}</button></div>`
    );
    this.wireAllocButtons();

    // 选装备。
    this.root.querySelectorAll<HTMLElement>("[data-pick]").forEach((el) => {
      el.onclick = () => {
        const id = el.dataset.pick!;
        this.selectedEquipId = this.selectedEquipId === id ? null : id;
        this.paintLoadout(vm);
      };
    });
    // 点单位卡装上（需先选中装备）。
    this.root.querySelectorAll<HTMLElement>("[data-equip-unit]").forEach((el) => {
      el.onclick = (ev) => {
        // 点在已装槽上时优先卸下（见下方 handler），此处仅处理装上。
        if ((ev.target as HTMLElement).closest(".lo-slot.filled")) return;
        if (!this.selectedEquipId) return;
        this.handlers.equip(el.dataset.equipUnit!, this.selectedEquipId);
      };
    });
    // 点已装槽卸下。
    this.root.querySelectorAll<HTMLElement>(".lo-slot.filled[data-unequip]").forEach((el) => {
      el.onclick = (ev) => {
        ev.stopPropagation();
        const defId = el.dataset.unequip;
        const slot = el.dataset.slot as EquipSlot | undefined;
        if (defId && slot) this.handlers.unequip(defId, slot);
      };
    });
    const back = this.root.querySelector<HTMLButtonElement>(`button[data-id="back"]`);
    if (back) back.onclick = () => this.handlers.closeLoadout();
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
