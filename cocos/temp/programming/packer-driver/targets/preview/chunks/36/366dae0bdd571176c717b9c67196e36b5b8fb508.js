System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, Vec3, CoordMap, _crd;

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../game-core/index", _context.meta, extras);
  }

  _export("CoordMap", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      Vec3 = _cc.Vec3;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "eea60xuEQZEEZJmJP34vDaI", "CoordMap", undefined);

      __checkObsolete__(['Vec3']);

      /**
       * 逻辑格 ↔ 3D 世界坐标映射。
       *
       * 逻辑坐标:x 向右、y 向上(游戏内核约定),原点在左下。
       * 世界坐标:棋盘平铺在 XZ 平面(y=0 为格面),棋盘中心对齐世界原点;
       *          逻辑 +y 映射到世界 -Z(屏幕里「往里/往上」),与倾斜俯视相机一致。
       */
      _export("CoordMap", CoordMap = class CoordMap {
        constructor(width, height, cellSize) {
          if (cellSize === void 0) {
            cellSize = 1;
          }

          this.cell = void 0;
          this.halfW = void 0;
          this.halfH = void 0;
          this.width = width;
          this.height = height;
          this.cell = cellSize;
          this.halfW = (width - 1) / 2;
          this.halfH = (height - 1) / 2;
        }
        /** 逻辑格中心 → 世界坐标(worldY 为格面高度,默认 0)。 */


        cellToWorld(x, y, worldY, out) {
          if (worldY === void 0) {
            worldY = 0;
          }

          var wx = (x - this.halfW) * this.cell;
          var wz = -(y - this.halfH) * this.cell;
          return out ? out.set(wx, worldY, wz) : new Vec3(wx, worldY, wz);
        }

        posToWorld(p, worldY, out) {
          if (worldY === void 0) {
            worldY = 0;
          }

          return this.cellToWorld(p.x, p.y, worldY, out);
        }
        /** 世界坐标(XZ 平面)→ 最近逻辑格;越界返回 null。 */


        worldToCell(world) {
          var x = Math.round(world.x / this.cell + this.halfW);
          var y = Math.round(-world.z / this.cell + this.halfH);
          if (x < 0 || y < 0 || x >= this.width || y >= this.height) return null;
          return {
            x,
            y
          };
        }
        /** 棋盘在世界中的边长(用于相机取景)。 */


        get worldWidth() {
          return this.width * this.cell;
        }

        get worldDepth() {
          return this.height * this.cell;
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=366dae0bdd571176c717b9c67196e36b5b8fb508.js.map