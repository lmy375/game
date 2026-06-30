System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Vec3, Label, Button, UITransform, view, uiNode, uiLabel, uiSolid, UI, hex, HudView, _crd;

  function _reportPossibleCrUseOfSceneRig(extras) {
    _reporterNs.report("SceneRig", "./SceneRig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfuiNode(extras) {
    _reporterNs.report("uiNode", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfuiLabel(extras) {
    _reporterNs.report("uiLabel", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfuiSolid(extras) {
    _reporterNs.report("uiSolid", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUI(extras) {
    _reporterNs.report("UI", "./Palette", _context.meta, extras);
  }

  function _reportPossibleCrUseOfhex(extras) {
    _reporterNs.report("hex", "./Palette", _context.meta, extras);
  }

  _export("HudView", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Vec3 = _cc.Vec3;
      Label = _cc.Label;
      Button = _cc.Button;
      UITransform = _cc.UITransform;
      view = _cc.view;
    }, function (_unresolved_2) {
      uiNode = _unresolved_2.uiNode;
      uiLabel = _unresolved_2.uiLabel;
      uiSolid = _unresolved_2.uiSolid;
    }, function (_unresolved_3) {
      UI = _unresolved_3.UI;
      hex = _unresolved_3.hex;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "9cbb8rjAWlN06fSxscpuaqB", "HudView", undefined);

      __checkObsolete__(['Node', 'Vec3', 'Color', 'Label', 'Button', 'UITransform', 'view']);

      /**
       * HUD:回合提示、行动顺序、双方名册、战斗日志、浮动技能菜单、确认条、结算横幅。
       * 纯展示层:所有数据由 InputController 计算后喂入,按钮回调回传给控制器。
       */
      _export("HudView", HudView = class HudView {
        constructor(rig) {
          this.root = void 0;
          this.turnLabel = void 0;
          this.hintLabel = void 0;
          this.orderLabel = void 0;
          this.rosterLabel = void 0;
          this.logLabel = void 0;
          this.menu = void 0;
          this.confirm = void 0;
          this.banner = void 0;
          this.logLines = [];
          this.rig = rig;
        }

        build() {
          this.root = (_crd && uiNode === void 0 ? (_reportPossibleCrUseOfuiNode({
            error: Error()
          }), uiNode) : uiNode)("HUD", this.rig.canvas);
          var size = view.getVisibleSize();
          var halfW = size.width / 2;
          var halfH = size.height / 2;
          this.turnLabel = (_crd && uiLabel === void 0 ? (_reportPossibleCrUseOfuiLabel({
            error: Error()
          }), uiLabel) : uiLabel)(this.root, "", {
            size: 24,
            color: (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).text,
            bold: true,
            outline: (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#000", 200)
          });
          this.turnLabel.node.setPosition(new Vec3(0, halfH - 30, 0));
          this.hintLabel = (_crd && uiLabel === void 0 ? (_reportPossibleCrUseOfuiLabel({
            error: Error()
          }), uiLabel) : uiLabel)(this.root, "", {
            size: 16,
            color: (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).accent,
            outline: (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#000", 180)
          });
          this.hintLabel.node.setPosition(new Vec3(0, halfH - 60, 0));
          this.hintLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
          var orderPanel = (_crd && uiSolid === void 0 ? (_reportPossibleCrUseOfuiSolid({
            error: Error()
          }), uiSolid) : uiSolid)(this.root, 230, 64, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).panel).node;
          orderPanel.setPosition(new Vec3(-halfW + 125, halfH - 50, 0));
          this.orderLabel = (_crd && uiLabel === void 0 ? (_reportPossibleCrUseOfuiLabel({
            error: Error()
          }), uiLabel) : uiLabel)(orderPanel, "", {
            size: 14,
            color: (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).text
          });
          this.orderLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
          this.orderLabel.verticalAlign = Label.VerticalAlign.TOP;
          this.orderLabel.node.getComponent(UITransform).setContentSize(210, 56);
          var rosterPanel = (_crd && uiSolid === void 0 ? (_reportPossibleCrUseOfuiSolid({
            error: Error()
          }), uiSolid) : uiSolid)(this.root, 230, 220, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).panel).node;
          rosterPanel.setPosition(new Vec3(-halfW + 125, halfH - 185, 0));
          this.rosterLabel = (_crd && uiLabel === void 0 ? (_reportPossibleCrUseOfuiLabel({
            error: Error()
          }), uiLabel) : uiLabel)(rosterPanel, "", {
            size: 15,
            color: (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).text
          });
          this.rosterLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
          this.rosterLabel.verticalAlign = Label.VerticalAlign.TOP;
          this.rosterLabel.node.getComponent(UITransform).setContentSize(210, 200);
          var logPanel = (_crd && uiSolid === void 0 ? (_reportPossibleCrUseOfuiSolid({
            error: Error()
          }), uiSolid) : uiSolid)(this.root, 300, 180, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).panel).node;
          logPanel.setPosition(new Vec3(-halfW + 160, -halfH + 100, 0));
          this.logLabel = (_crd && uiLabel === void 0 ? (_reportPossibleCrUseOfuiLabel({
            error: Error()
          }), uiLabel) : uiLabel)(logPanel, "", {
            size: 13,
            color: (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).textDim
          });
          this.logLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
          this.logLabel.verticalAlign = Label.VerticalAlign.TOP;
          this.logLabel.node.getComponent(UITransform).setContentSize(280, 164);
          this.menu = (_crd && uiNode === void 0 ? (_reportPossibleCrUseOfuiNode({
            error: Error()
          }), uiNode) : uiNode)("SkillMenu", this.root);
          this.menu.active = false;
          this.confirm = (_crd && uiNode === void 0 ? (_reportPossibleCrUseOfuiNode({
            error: Error()
          }), uiNode) : uiNode)("ConfirmBar", this.root);
          this.confirm.setPosition(new Vec3(0, -halfH + 60, 0));
          this.confirm.active = false;
          this.banner = (_crd && uiNode === void 0 ? (_reportPossibleCrUseOfuiNode({
            error: Error()
          }), uiNode) : uiNode)("Banner", this.root);
          this.banner.active = false;
        }

        setTurn(text) {
          this.turnLabel.string = text;
        }

        setHint(text) {
          this.hintLabel.string = text;
        }

        log(msg) {
          this.logLines.unshift(msg);
          if (this.logLines.length > 12) this.logLines.length = 12;
          this.logLabel.string = this.logLines.join("\n");
        }

        clearLog() {
          this.logLines = [];
          this.logLabel.string = "";
        }

        renderOrder(chips) {
          this.orderLabel.string = "行动顺序\n" + chips.map(c => c.kind === "now" ? "\u25B6" + c.name : c.name).join(" › ");
        }

        renderRoster(rows) {
          var fmt = r => "" + (r.sel ? "▶ " : "  ") + (r.dead ? "☠ " : "") + r.name + "  \u901F" + r.speed + "  " + Math.max(0, r.hp) + "/" + r.maxHp;

          var players = rows.filter(r => r.faction === "player");
          var enemies = rows.filter(r => r.faction === "enemy");
          this.rosterLabel.string = "【我方】\n" + players.map(fmt).join("\n") + "\n\n【敌方】\n" + enemies.map(fmt).join("\n");
        } // ── 浮动技能菜单 ─────────────────────────────────────────────────


        showMenu(title, items, showUndo, uiPos, cbs) {
          var _this = this;

          for (var c of [...this.menu.children]) c.destroy();

          this.menu.active = true;
          var btnH = 34;
          var gap = 6;
          var rows = items.length + (showUndo ? 1 : 0) + 1; // + 结束行动

          var panelH = 28 + rows * (btnH + gap);
          var panelW = 168;
          var bg = (_crd && uiSolid === void 0 ? (_reportPossibleCrUseOfuiSolid({
            error: Error()
          }), uiSolid) : uiSolid)(this.menu, panelW, panelH, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).panel).node;
          var titleLab = (_crd && uiLabel === void 0 ? (_reportPossibleCrUseOfuiLabel({
            error: Error()
          }), uiLabel) : uiLabel)(bg, title, {
            size: 15,
            color: (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).accent,
            bold: true
          });
          titleLab.node.setPosition(new Vec3(0, panelH / 2 - 16, 0));
          var y = panelH / 2 - 36;

          var _loop = function _loop(it) {
            _this.button(bg, "" + it.name, panelW - 20, btnH, new Vec3(0, y, 0), it.disabled, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).accent, () => cbs.onSkill(it.skillId));

            y -= btnH + gap;
          };

          for (var it of items) {
            _loop(it);
          }

          if (showUndo && cbs.onUndo) {
            this.button(bg, "↩ 撤销移动", panelW - 20, btnH, new Vec3(0, y, 0), false, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).textDim, cbs.onUndo);
            y -= btnH + gap;
          }

          this.button(bg, "✔ 结束行动", panelW - 20, btnH, new Vec3(0, y, 0), false, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).textDim, cbs.onEnd); // 贴近单位放在其右侧,越界则翻到左侧 / 夹紧

          var size = view.getVisibleSize();
          var px = uiPos.x + 70 + panelW / 2;
          if (px + panelW / 2 > size.width / 2) px = uiPos.x - 70 - panelW / 2;
          var py = uiPos.y;
          py = Math.max(-size.height / 2 + panelH / 2, Math.min(size.height / 2 - panelH / 2, py));
          this.menu.setPosition(new Vec3(px, py, 0));
        }

        hideMenu() {
          this.menu.active = false;
        } // ── 确认条 ───────────────────────────────────────────────────────


        showConfirm(skillName, desc, canFire, cbs) {
          for (var c of [...this.confirm.children]) c.destroy();

          this.confirm.active = true;
          var w = 560;
          var bg = (_crd && uiSolid === void 0 ? (_reportPossibleCrUseOfuiSolid({
            error: Error()
          }), uiSolid) : uiSolid)(this.confirm, w, 56, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).panel).node;
          var text = (_crd && uiLabel === void 0 ? (_reportPossibleCrUseOfuiLabel({
            error: Error()
          }), uiLabel) : uiLabel)(bg, skillName + "\u3000" + desc, {
            size: 15,
            color: canFire ? (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).text : (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).textDim
          });
          text.node.setPosition(new Vec3(-60, 0, 0));
          text.node.getComponent(UITransform).setContentSize(360, 48);
          this.button(bg, "✓ 释放", 90, 36, new Vec3(w / 2 - 150, 0, 0), !canFire, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).hpFull, cbs.onConfirm);
          this.button(bg, "✕ 取消", 90, 36, new Vec3(w / 2 - 50, 0, 0), false, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).danger, cbs.onCancel);
        }

        hideConfirm() {
          this.confirm.active = false;
        } // ── 结算横幅 ─────────────────────────────────────────────────────


        showBanner(win, onNext) {
          for (var c of [...this.banner.children]) c.destroy();

          this.banner.active = true;
          var bg = (_crd && uiSolid === void 0 ? (_reportPossibleCrUseOfuiSolid({
            error: Error()
          }), uiSolid) : uiSolid)(this.banner, 360, 180, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).panel).node;
          var lab = (_crd && uiLabel === void 0 ? (_reportPossibleCrUseOfuiLabel({
            error: Error()
          }), uiLabel) : uiLabel)(bg, win ? "🎉 胜利!" : "💀 战败", {
            size: 36,
            color: win ? (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).hpFull : (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).danger,
            bold: true
          });
          lab.node.setPosition(new Vec3(0, 36, 0));
          this.button(bg, win ? "继续" : "重试", 140, 44, new Vec3(0, -40, 0), false, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).accent, onNext);
        }

        hideBanner() {
          this.banner.active = false;
        }

        button(parent, text, w, h, pos, disabled, color, onClick) {
          var {
            node
          } = (_crd && uiSolid === void 0 ? (_reportPossibleCrUseOfuiSolid({
            error: Error()
          }), uiSolid) : uiSolid)(parent, w, h, disabled ? (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
            error: Error()
          }), hex) : hex)("#2a3142", 200) : color.clone());
          node.setPosition(pos);
          var lab = (_crd && uiLabel === void 0 ? (_reportPossibleCrUseOfuiLabel({
            error: Error()
          }), uiLabel) : uiLabel)(node, text, {
            size: 15,
            color: disabled ? (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
              error: Error()
            }), UI) : UI).textDim : (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
              error: Error()
            }), hex) : hex)("#0d0f15"),
            bold: true
          });
          lab.node.setPosition(Vec3.ZERO);
          var btn = node.addComponent(Button);
          btn.interactable = !disabled;
          if (!disabled) node.on(Button.EventType.CLICK, onClick);
          return node;
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=8e384408b15c4a61b4d5b4520cdfc171cf97c5bc.js.map