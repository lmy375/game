/**
 * DOM HUD 渲染器：把交互层的 ViewModel 渲染成菜单/确认条/信息栏/回合提示/横幅。
 * 「菜单像素定位」因引擎而异，由 positionMenu 注入。
 */
import { Position } from "@core/index";
import { ViewModel } from "../../interaction";
import { skillIconUrls } from "./AssetManifest";

export interface HudEls {
  menu: HTMLElement;
  info: HTMLElement;
  log: HTMLElement;
  hint: HTMLElement;
  turn: HTMLElement;
  confirmBar: HTMLElement;
  banner: HTMLElement;
}

export interface HudHandlers {
  selectSkill(skillId: string): void;
  selectItem(itemId: string): void;
  undoMove(): void;
  endTurn(): void;
  rest(): void;
  openLoadout(): void;
  confirm(): void;
  cancel(): void;
  restart(): void;
}

/** 把菜单元素定位到锚定格附近；各引擎换算屏幕坐标的方式不同。 */
export type PositionMenu = (menuEl: HTMLElement, anchorCell: Position) => void;

export class DomHud {
  constructor(
    private readonly els: HudEls,
    private readonly handlers: HudHandlers,
    private readonly positionMenu: PositionMenu
  ) {
    // 菜单浮在棋盘上方会挡住画布的右键事件：在菜单上右键同样视为取消（收起菜单）。
    this.els.menu.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.handlers.cancel();
    });
  }

  render(vm: ViewModel): void {
    this.els.hint.textContent = vm.hint;
    this.renderMenu(vm);
    this.renderConfirmBar(vm);
    this.renderInfo(vm);
    this.els.turn.textContent = vm.turnText;
    this.renderBanner(vm);
  }

  log(msg: string): void {
    const div = document.createElement("div");
    div.textContent = msg;
    this.els.log.prepend(div);
    while (this.els.log.childElementCount > 80) this.els.log.lastChild?.remove();
  }

  clearLog(): void {
    this.els.log.innerHTML = "";
  }

  private renderMenu(vm: ViewModel): void {
    const menu = this.els.menu;
    if (!vm.menu.visible) {
      menu.style.display = "none";
      menu.innerHTML = "";
      return;
    }
    menu.innerHTML = "";
    const title = document.createElement("div");
    title.className = "menu-title";
    title.textContent = vm.menu.unitName;
    menu.appendChild(title);

    for (const s of vm.menu.skills) {
      const btn = document.createElement("button");
      btn.className = "skill-btn";
      btn.disabled = s.disabled;
      const icon = skillIconUrls[s.id as keyof typeof skillIconUrls] ?? skillIconUrls.fallback;
      btn.innerHTML = `<span class="skill-icon" style="background-image:url('${icon}')"></span><span class="skill-copy"><b>${s.name}</b><small>${s.short}</small></span>`;
      btn.title = s.full;
      btn.onclick = () => this.handlers.selectSkill(s.id);
      menu.appendChild(btn);
    }

    // 道具区：消耗品占技能行动，随技能菜单一起显示。
    if (vm.items.visible && vm.items.items.length > 0) {
      const sep = document.createElement("div");
      sep.className = "menu-subtitle";
      sep.textContent = "道具";
      menu.appendChild(sep);
      for (const it of vm.items.items) {
        const btn = document.createElement("button");
        btn.className = "skill-btn item-btn";
        btn.disabled = it.disabled;
        btn.innerHTML = `<span class="skill-icon item-icon">🧪</span><span class="skill-copy"><b>${it.name}</b><small>${it.short}</small></span>`;
        btn.title = it.full;
        btn.onclick = () => this.handlers.selectItem(it.itemId);
        menu.appendChild(btn);
      }
    }

    // 调息：恢复少量生命并结束行动（无事可做时的选项）。
    const rest = document.createElement("button");
    rest.className = "skill-btn rest-btn";
    rest.disabled = vm.menu.rest.disabled;
    rest.innerHTML = `<span class="skill-icon rest-icon">🧘</span><span class="skill-copy"><b>调息</b><small>${vm.menu.rest.short}</small></span>`;
    rest.title = "原地调息：恢复少量生命，并结束该单位本回合行动";
    rest.onclick = () => this.handlers.rest();
    menu.appendChild(rest);

    if (vm.menu.showUndo) {
      const undo = document.createElement("button");
      undo.className = "menu-secondary";
      undo.textContent = "↩ 撤销移动";
      undo.onclick = () => this.handlers.undoMove();
      menu.appendChild(undo);
    }

    // 休整：打开整备界面（调整装备/技能后返回战斗）。
    if (vm.menu.showLoadout) {
      const loadout = document.createElement("button");
      loadout.className = "menu-secondary";
      loadout.textContent = "🛠 休整";
      loadout.title = "进入整备界面：调整装备与技能，返回后立即生效";
      loadout.onclick = () => this.handlers.openLoadout();
      menu.appendChild(loadout);
    }

    const end = document.createElement("button");
    end.className = "menu-secondary";
    end.textContent = "✔ 结束行动";
    end.onclick = () => this.handlers.endTurn();
    menu.appendChild(end);

    menu.style.display = "flex";
    this.positionMenu(menu, vm.menu.anchorCell);
  }

  private renderConfirmBar(vm: ViewModel): void {
    const bar = this.els.confirmBar;
    if (!vm.confirm.visible) {
      bar.style.display = "none";
      bar.replaceChildren();
      return;
    }
    bar.style.display = "flex";
    bar.innerHTML = `<div class="preview-text"><b>${vm.confirm.skillName}</b>　${vm.confirm.desc}</div>`;
    const ok = document.createElement("button");
    ok.textContent = "✓ 释放";
    ok.className = "confirm-yes";
    ok.disabled = !vm.confirm.canRelease;
    ok.onclick = () => this.handlers.confirm();
    const no = document.createElement("button");
    no.textContent = "✕ 取消";
    no.className = "confirm-no";
    no.onclick = () => this.handlers.cancel();
    bar.appendChild(ok);
    bar.appendChild(no);
  }

  private renderInfo(vm: ViewModel): void {
    const order = vm.info.order
      .map((c) => {
        const cls = c.kind === "now" ? "order-now" : c.kind === "player" ? "order-p" : "order-e";
        return `<span class="order-chip ${cls}">${c.name}</span>`;
      })
      .join("<span class='order-arrow'>›</span>");

    const row = (u: ViewModel["info"]["players"][number]) =>
      `<div class="unit-row ${u.faction} ${u.dead ? "dead" : ""} ${u.selected ? "sel" : ""}">` +
      `<span class="dot"></span>${u.name} <span class="spd">速${u.speed}</span> ` +
      `<span class="hp">${u.hp}/${u.maxHp}</span></div>`;
    const players = vm.info.players.map(row).join("");
    const enemies = vm.info.enemies.map(row).join("");
    this.els.info.innerHTML =
      `<div class="order-row"><span class="order-label">行动顺序</span>${order}</div>` +
      `<div class="cols"><div class="col"><div class="col-title">我方</div>${players}</div>` +
      `<div class="col"><div class="col-title">敌方</div>${enemies}</div></div>`;
  }

  private renderBanner(vm: ViewModel): void {
    const banner = this.els.banner;
    if (!vm.banner) {
      banner.style.display = "none";
      return;
    }
    const win = vm.banner === "player_win";
    banner.style.display = "flex";
    banner.innerHTML = `<div class="banner-inner ${win ? "win" : "lose"}">${
      win ? "🎉 胜利！" : "💀 战败"
    }<br><button id="banner-next">${win ? "继续" : "重试"}</button></div>`;
    const btn = banner.querySelector<HTMLButtonElement>("#banner-next");
    if (btn) btn.onclick = () => this.handlers.restart();
  }
}
