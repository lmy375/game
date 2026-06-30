System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Node, boxMesh, litMat, meshNode, TERRAIN, TERRAIN_EMISSIVE, hex, BoardView, _crd, key, SHAPE;

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTerrainType(extras) {
    _reporterNs.report("TerrainType", "../game-core/index", _context.meta, extras);
  }

  function _reportPossibleCrUseOfCoordMap(extras) {
    _reporterNs.report("CoordMap", "../core/CoordMap", _context.meta, extras);
  }

  function _reportPossibleCrUseOfboxMesh(extras) {
    _reporterNs.report("boxMesh", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOflitMat(extras) {
    _reporterNs.report("litMat", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmeshNode(extras) {
    _reporterNs.report("meshNode", "./Factory", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTERRAIN(extras) {
    _reporterNs.report("TERRAIN", "./Palette", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTERRAIN_EMISSIVE(extras) {
    _reporterNs.report("TERRAIN_EMISSIVE", "./Palette", _context.meta, extras);
  }

  function _reportPossibleCrUseOfhex(extras) {
    _reporterNs.report("hex", "./Palette", _context.meta, extras);
  }

  _export("BoardView", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Node = _cc.Node;
    }, function (_unresolved_2) {
      boxMesh = _unresolved_2.boxMesh;
      litMat = _unresolved_2.litMat;
      meshNode = _unresolved_2.meshNode;
    }, function (_unresolved_3) {
      TERRAIN = _unresolved_3.TERRAIN;
      TERRAIN_EMISSIVE = _unresolved_3.TERRAIN_EMISSIVE;
      hex = _unresolved_3.hex;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "1139amZNBZNF7xqOq7+n/W9", "BoardView", undefined);

      __checkObsolete__(['Node', 'Vec3']);

      key = p => `${p.x},${p.y}`;
      /** 每种地形的立体外观:格面高度(top)与厚度。 */


      SHAPE = {
        ground: {
          top: 0,
          thick: 0.22
        },
        fire: {
          top: 0.02,
          thick: 0.24
        },
        trap: {
          top: 0.02,
          thick: 0.24
        },
        obstacle: {
          top: 0.6,
          thick: 0.6
        },
        wall: {
          top: 1.05,
          thick: 1.05
        }
      };
      /**
       * 3D 棋盘:每格一块薄/高的立方体,按地形着色;墙体/障碍加高,火/陷阱自发光。
       * 单位、高亮、特效都以「格面 y=0」为基准叠在其上。
       */

      _export("BoardView", BoardView = class BoardView {
        constructor() {
          this.root = void 0;
          this.tiles = new Map();
        }

        build(parent, state, coord) {
          this.root = new Node("Tiles");
          parent.addChild(this.root);
          state.board.forEachTile((p, terrain) => this.makeTile(p, terrain, coord));
        }

        makeTile(p, terrain, coord) {
          var _SHAPE$terrain, _terrain;

          const shape = (_SHAPE$terrain = SHAPE[terrain]) != null ? _SHAPE$terrain : SHAPE.ground;
          const size = coord.cell * 0.94;
          const mesh = (_crd && boxMesh === void 0 ? (_reportPossibleCrUseOfboxMesh({
            error: Error()
          }), boxMesh) : boxMesh)(size, shape.thick, size);
          const mat = (_crd && litMat === void 0 ? (_reportPossibleCrUseOflitMat({
            error: Error()
          }), litMat) : litMat)((_terrain = (_crd && TERRAIN === void 0 ? (_reportPossibleCrUseOfTERRAIN({
            error: Error()
          }), TERRAIN) : TERRAIN)[terrain]) != null ? _terrain : (_crd && TERRAIN === void 0 ? (_reportPossibleCrUseOfTERRAIN({
            error: Error()
          }), TERRAIN) : TERRAIN).ground, (_crd && TERRAIN_EMISSIVE === void 0 ? (_reportPossibleCrUseOfTERRAIN_EMISSIVE({
            error: Error()
          }), TERRAIN_EMISSIVE) : TERRAIN_EMISSIVE)[terrain]);
          const n = (_crd && meshNode === void 0 ? (_reportPossibleCrUseOfmeshNode({
            error: Error()
          }), meshNode) : meshNode)(`tile_${key(p)}`, this.root, mesh, mat); // 让立方体顶面落在 shape.top:中心 = top - thick/2

          const w = coord.posToWorld(p, shape.top - shape.thick / 2);
          n.setPosition(w);
          this.tiles.set(key(p), n); // 网格描边:细一圈深色边框立方体,凸显格子分界

          const edge = (_crd && meshNode === void 0 ? (_reportPossibleCrUseOfmeshNode({
            error: Error()
          }), meshNode) : meshNode)(`edge_${key(p)}`, this.root, (_crd && boxMesh === void 0 ? (_reportPossibleCrUseOfboxMesh({
            error: Error()
          }), boxMesh) : boxMesh)(coord.cell * 0.98, 0.02, coord.cell * 0.98), (_crd && litMat === void 0 ? (_reportPossibleCrUseOflitMat({
            error: Error()
          }), litMat) : litMat)((_crd && hex === void 0 ? (_reportPossibleCrUseOfhex({
            error: Error()
          }), hex) : hex)("#0a0c11")));
          edge.setPosition(coord.posToWorld(p, shape.top + 0.001));
        }
        /** 地形改变(如障碍被摧毁 → 地面)时重建该格。 */


        updateTerrain(p, terrain, coord) {
          const old = this.tiles.get(key(p));
          if (old) old.destroy();
          this.makeTile(p, terrain, coord);
        }
        /** 某格格面的世界坐标(供其它视图对齐)。 */


        faceWorld(p, coord, out) {
          return coord.posToWorld(p, 0, out);
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=94a97de4736122061f370c3f16507f6d577dd626.js.map