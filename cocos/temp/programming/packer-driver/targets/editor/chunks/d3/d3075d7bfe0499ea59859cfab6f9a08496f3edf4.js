System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2", "__unresolved_3"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Node, Vec3, Color, Layers, tween, MeshRenderer, isAlive, cylinderMesh, sphereMesh, torusMesh, boxMesh, litMat, unlitMat, meshNode, FACTION, UI, hex, UnitSprite, UnitView, _crd, ACCENT, FACE_OFFSET;

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnit(extras) {
    _reporterNs.report("Unit", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfisAlive(extras) {
    _reporterNs.report("isAlive", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCoordMap(extras) {
    _reporterNs.report("CoordMap", "../core/CoordMap", _context.meta, extras);
  }

  function _reportPossibleCrUseOfSceneRig(extras) {
    _reporterNs.report("SceneRig", "./SceneRig", _context.meta, extras);
  }

  function _reportPossibleCrUseOfcylinderMesh(extras) {
    _reporterNs.report("cylinderMesh", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfsphereMesh(extras) {
    _reporterNs.report("sphereMesh", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOftorusMesh(extras) {
    _reporterNs.report("torusMesh", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfboxMesh(extras) {
    _reporterNs.report("boxMesh", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOflitMat(extras) {
    _reporterNs.report("litMat", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfunlitMat(extras) {
    _reporterNs.report("unlitMat", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmeshNode(extras) {
    _reporterNs.report("meshNode", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfFACTION(extras) {
    _reporterNs.report("FACTION", "./Palette", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUI(extras) {
    _reporterNs.report("UI", "./Palette", _context.meta, extras);
  }

  function _reportPossibleCrUseOfhex(extras) {
    _reporterNs.report("hex", "./Palette", _context.meta, extras);
  }

  _export("UnitView", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Node = _cc.Node;
      Vec3 = _cc.Vec3;
      Color = _cc.Color;
      Layers = _cc.Layers;
      tween = _cc.tween;
      MeshRenderer = _cc.MeshRenderer;
    }, function (_unresolved_2) {
      isAlive = _unresolved_2.isAlive;
    }, function (_unresolved_3) {
      cylinderMesh = _unresolved_3.cylinderMesh;
      sphereMesh = _unresolved_3.sphereMesh;
      torusMesh = _unresolved_3.torusMesh;
      boxMesh = _unresolved_3.boxMesh;
      litMat = _unresolved_3.litMat;
      unlitMat = _unresolved_3.unlitMat;
      meshNode = _unresolved_3.meshNode;
    }, function (_unresolved_4) {
      FACTION = _unresolved_4.FACTION;
      UI = _unresolved_4.UI;
      hex = _unresolved_4.hex;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "2ccb1fRRlNLA4jL893R/r0x", "UnitView", undefined);

      __checkObsolete__(['Node', 'Vec3', 'Color', 'Layers', 'tween', 'MeshRenderer']);

      /** 单位头部点缀色:让同阵营不同角色可区分(无文字时用颜色区分)。 */
      ACCENT = {
        wind_mage: "#8fe3ff",
        fire_mage: "#ff8a3a",
        spear_knight: "#cfe0a0",
        lancer: "#cfe0a0",
        enemy_soldier: "#ffb0a8",
        enemy_archer: "#ffd28a",
        enemy_tank: "#d0b0ff"
      };
      FACE_OFFSET = {
        right: [0.34, 0],
        left: [-0.34, 0],
        up: [0, -0.34],
        // 逻辑 +y → 世界 -z
        down: [0, 0.34]
      };
      /**
       * 单个单位的 3D 立绘(棋子式):底座选中环 + 圆柱躯干 + 球头 + 朝向凸起 + 悬浮血条。
       * 全部是 boardRoot 下的 3D 物件,与地块/高亮共用同一坐标与相机 —— 不存在投影错位。
       */

      _export("UnitSprite", UnitSprite = class UnitSprite {
        constructor(parent, unit, world) {
          var _unit$faction, _ACCENT$unit$defId;

          this.node = void 0;
          // 位于世界坐标(由 UnitView.project 每帧从 world 同步)
          this.world = void 0;
          // 追踪用世界坐标(EventAnimator 补间的就是它)
          this.maxHp = void 0;
          this.faceNode = void 0;
          this.hpFill = void 0;
          this.ring = void 0;
          this.world = world.clone();
          this.maxHp = unit.maxHp;
          const base = (_unit$faction = (_crd && FACTION === void 0 ? (_reportPossibleCrUseOfFACTION({
            error: Error()
          }), FACTION) : FACTION)[unit.faction]) != null ? _unit$faction : (_crd && FACTION === void 0 ? (_reportPossibleCrUseOfFACTION({
            error: Error()
          }), FACTION) : FACTION).enemy;
          const accent = (_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
            error: Error()
          }), hex) : hex)((_ACCENT$unit$defId = ACCENT[unit.defId]) != null ? _ACCENT$unit$defId : unit.faction === "player" ? "#cfe0ff" : "#ffd0c8");
          this.node = new Node(`unit_${unit.instanceId}`);
          this.node.layer = Layers.Enum.DEFAULT;
          parent.addChild(this.node);
          this.node.setPosition(world); // 选中环(贴地)

          this.ring = (_crd && meshNode === void 0 ? (_reportPossibleCrUseOfmeshNode({
            error: Error()
          }), meshNode) : meshNode)("ring", this.node, (_crd && torusMesh === void 0 ? (_reportPossibleCrUseOftorusMesh({
            error: Error()
          }), torusMesh) : torusMesh)(0.4, 0.05), (_crd && unlitMat === void 0 ? (_reportPossibleCrUseOfunlitMat({
            error: Error()
          }), unlitMat) : unlitMat)((_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
            error: Error()
          }), hex) : hex)("#ffe066")), false);
          this.ring.setRotationFromEuler(-90, 0, 0);
          this.ring.setPosition(0, 0.04, 0);
          this.ring.active = false; // 躯干 + 头

          const body = (_crd && meshNode === void 0 ? (_reportPossibleCrUseOfmeshNode({
            error: Error()
          }), meshNode) : meshNode)("body", this.node, (_crd && cylinderMesh === void 0 ? (_reportPossibleCrUseOfcylinderMesh({
            error: Error()
          }), cylinderMesh) : cylinderMesh)(0.28, 0.52), (_crd && litMat === void 0 ? (_reportPossibleCrUseOflitMat({
            error: Error()
          }), litMat) : litMat)(base));
          body.setPosition(0, 0.28, 0);
          const head = (_crd && meshNode === void 0 ? (_reportPossibleCrUseOfmeshNode({
            error: Error()
          }), meshNode) : meshNode)("head", this.node, (_crd && sphereMesh === void 0 ? (_reportPossibleCrUseOfsphereMesh({
            error: Error()
          }), sphereMesh) : sphereMesh)(0.17), (_crd && litMat === void 0 ? (_reportPossibleCrUseOflitMat({
            error: Error()
          }), litMat) : litMat)(accent));
          head.setPosition(0, 0.66, 0); // 朝向凸起

          this.faceNode = (_crd && meshNode === void 0 ? (_reportPossibleCrUseOfmeshNode({
            error: Error()
          }), meshNode) : meshNode)("face", this.node, (_crd && boxMesh === void 0 ? (_reportPossibleCrUseOfboxMesh({
            error: Error()
          }), boxMesh) : boxMesh)(0.14, 0.14, 0.2), (_crd && litMat === void 0 ? (_reportPossibleCrUseOflitMat({
            error: Error()
          }), litMat) : litMat)((_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
            error: Error()
          }), hex) : hex)("#ffffff")));
          this.faceNode.setPosition(0.34, 0.4, 0); // 血条(贴地朝上的薄片:底 + 填充),从上往下看可读

          const backW = 0.62;
          const hpBack = (_crd && meshNode === void 0 ? (_reportPossibleCrUseOfmeshNode({
            error: Error()
          }), meshNode) : meshNode)("hpb", this.node, (_crd && boxMesh === void 0 ? (_reportPossibleCrUseOfboxMesh({
            error: Error()
          }), boxMesh) : boxMesh)(backW, 0.02, 0.14), (_crd && unlitMat === void 0 ? (_reportPossibleCrUseOfunlitMat({
            error: Error()
          }), unlitMat) : unlitMat)((_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
            error: Error()
          }), hex) : hex)("#11141b")), false);
          hpBack.setPosition(0, 1.04, 0);
          this.hpFill = (_crd && meshNode === void 0 ? (_reportPossibleCrUseOfmeshNode({
            error: Error()
          }), meshNode) : meshNode)("hpf", this.node, (_crd && boxMesh === void 0 ? (_reportPossibleCrUseOfboxMesh({
            error: Error()
          }), boxMesh) : boxMesh)(0.58, 0.03, 0.1), (_crd && unlitMat === void 0 ? (_reportPossibleCrUseOfunlitMat({
            error: Error()
          }), unlitMat) : unlitMat)((_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).hpFull), false);
          this.hpFill.setPosition(0, 1.05, 0);
          this.redraw(unit);
        }

        redraw(unit) {
          this.setHp(unit.hp);
          this.setFacing(unit.facing);
          this.node.active = (_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
            error: Error()
          }), isAlive) : isAlive)(unit);
        }

        setHp(now) {
          var _this$hpFill$getCompo;

          const ratio = this.maxHp > 0 ? Math.max(0, Math.min(1, now / this.maxHp)) : 0;
          const full = 0.58;
          this.hpFill.setScale(ratio, 1, 1);
          this.hpFill.setPosition(-(full * (1 - ratio)) / 2, 1.05, 0.001);
          const col = new Color();
          Color.lerp(col, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).hpLow, (_crd && UI === void 0 ? (_reportPossibleCrUseOfUI({
            error: Error()
          }), UI) : UI).hpFull, ratio);
          (_this$hpFill$getCompo = this.hpFill.getComponent(MeshRenderer)) == null || (_this$hpFill$getCompo = _this$hpFill$getCompo.material) == null || _this$hpFill$getCompo.setProperty("mainColor", col);
        }

        setFacing(dir) {
          var _FACE_OFFSET$dir;

          const [dx, dz] = (_FACE_OFFSET$dir = FACE_OFFSET[dir]) != null ? _FACE_OFFSET$dir : FACE_OFFSET.right;
          this.faceNode.setPosition(dx, 0.4, dz);
        }

        punch(scale = 1.25, dur = 0.08) {
          tween(this.node).to(dur, {
            scale: new Vec3(scale, scale, scale)
          }).to(dur, {
            scale: new Vec3(1, 1, 1)
          }).start();
        }

        die(onDone, dur = 0.35) {
          tween(this.node).to(dur, {
            scale: new Vec3(0.05, 0.05, 0.05)
          }).call(onDone).start();
        }

        setSelected(on) {
          this.ring.active = on;
        }

      });
      /** 管理所有单位 3D 立绘:与状态同步、每帧把 world 同步到节点位置。 */


      _export("UnitView", UnitView = class UnitView {
        constructor(coord, rig) {
          this.sprites = new Map();
          this.group = void 0;
          this.coord = coord;
          this.rig = rig;
        }

        build() {
          this.group = new Node("Units3D");
          this.group.layer = Layers.Enum.DEFAULT;
          this.rig.boardRoot.addChild(this.group);
        }

        sync(state) {
          const seen = new Set();

          for (const u of state.units) {
            if (!(_crd && isAlive === void 0 ? (_reportPossibleCrUseOfisAlive({
              error: Error()
            }), isAlive) : isAlive)(u)) continue;
            seen.add(u.instanceId);
            let s = this.sprites.get(u.instanceId);
            const world = this.coord.posToWorld(u.pos, 0);

            if (!s) {
              s = new UnitSprite(this.group, u, world);
              this.sprites.set(u.instanceId, s);
            } else {
              s.world.set(world.x, world.y, world.z);
              s.redraw(u);
            }
          }

          for (const [id, s] of [...this.sprites]) {
            if (!seen.has(id)) {
              s.node.destroy();
              this.sprites.delete(id);
            }
          }

          this.project();
        }
        /** 每帧:把追踪用 world 同步到 3D 节点位置(动画期间 world 在被补间)。 */


        project() {
          for (const s of this.sprites.values()) s.node.setPosition(s.world);
        }

        get(id) {
          return this.sprites.get(id);
        }

        setSelected(id) {
          for (const [sid, s] of this.sprites) s.setSelected(sid === id);
        }

        redraw(unit) {
          var _this$sprites$get;

          (_this$sprites$get = this.sprites.get(unit.instanceId)) == null || _this$sprites$get.redraw(unit);
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=d3075d7bfe0499ea59859cfab6f9a08496f3edf4.js.map