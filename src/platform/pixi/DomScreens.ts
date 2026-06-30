/**
 * DOM 屏幕渲染器：把 campaign 的屏幕 ViewModel 渲染成 标题/过场/结算/结局 全屏覆盖层。镜像 DomHud 的形状。
 * 立绘优先用 AssetManifest 的图片，缺图时回退「圆盘 + 字形」纯 CSS。
 */
import { TitleVM, CutsceneVM, ResultVM, EndingVM, PortraitVM } from "../../campaign";
import { portraitUrlFor } from "./AssetManifest";

export interface ScreenHandlers {
  title(id: "new" | "continue"): void;
  cutsceneNext(): void;
  resultPrimary(): void;
  endingToTitle(): void;
}

function portraitHtml(p: PortraitVM): string {
  const cls = p.role === "tank" ? "portrait-tank" : p.faction === "enemy" ? "portrait-enemy" : "portrait-player";
  const url = portraitUrlFor(p.name) ?? portraitUrlFor(p.glyph);
  if (url) return `<span class="portrait portrait-img ${cls}" style="background-image:url('${url}')"></span>`;
  return `<span class="portrait ${cls}">${p.glyph}</span>`;
}

export class DomScreens {
  constructor(private readonly root: HTMLElement, private readonly handlers: ScreenHandlers) {}

  private open(inner: string): void {
    this.root.innerHTML = `<div class="screen">${inner}</div>`;
    this.root.classList.add("active");
  }

  hide(): void {
    this.root.classList.remove("active");
    this.root.innerHTML = "";
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
    this.open(
      `<h1 class="${vm.win ? "win" : "lose"}">${vm.title}</h1>${xp}` +
        `<div class="result-body">${ups}${items}</div>` +
        `<div class="btn-row"><button class="screen-btn" data-id="primary">${vm.primary.label}</button></div>`
    );
    const btn = this.root.querySelector<HTMLButtonElement>(`button[data-id="primary"]`);
    if (btn) btn.onclick = () => this.handlers.resultPrimary();
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
