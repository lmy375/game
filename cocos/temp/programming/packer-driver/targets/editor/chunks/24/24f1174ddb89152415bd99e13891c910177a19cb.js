System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, TERRAIN, GridBoard, _crd;

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "./geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTerrainType(extras) {
    _reporterNs.report("TerrainType", "./terrain", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTERRAIN(extras) {
    _reporterNs.report("TERRAIN", "./terrain", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTerrainProfile(extras) {
    _reporterNs.report("TerrainProfile", "./terrain", _context.meta, extras);
  }

  _export("GridBoard", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      TERRAIN = _unresolved_2.TERRAIN;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "fd47aPEhK1Ngb2Xlg0NxUqC", "GridBoard", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 方格棋盘。只存地形与尺寸；单位占用由 BattleState 维护（避免双向耦合）。
       * 纯数据 + 查询，无副作用驱动。
       */


      _export("GridBoard", GridBoard = class GridBoard {
        // grid[y][x]
        constructor(width, height, tiles = []) {
          this.width = void 0;
          this.height = void 0;
          this.grid = void 0;
          this.width = width;
          this.height = height;
          this.grid = [];

          for (let y = 0; y < height; y++) {
            const row = [];

            for (let x = 0; x < width; x++) row.push("ground");

            this.grid.push(row);
          }

          for (const t of tiles) {
            if (this.inBounds(t)) this.grid[t.y][t.x] = t.terrain;
          }
        }

        static from(data) {
          var _data$tiles;

          return new GridBoard(data.width, data.height, (_data$tiles = data.tiles) != null ? _data$tiles : []);
        }

        clone() {
          const b = new GridBoard(this.width, this.height);

          for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) b.grid[y][x] = this.grid[y][x];
          }

          return b;
        }

        inBounds(p) {
          return p.x >= 0 && p.x < this.width && p.y >= 0 && p.y < this.height;
        }

        terrainAt(p) {
          if (!this.inBounds(p)) return "wall"; // 边界外视为墙

          return this.grid[p.y][p.x];
        }

        profileAt(p) {
          return (_crd && TERRAIN === void 0 ? (_reportPossibleCrUseOfTERRAIN({
            error: Error()
          }), TERRAIN) : TERRAIN)[this.terrainAt(p)];
        }

        setTerrain(p, terrain) {
          if (this.inBounds(p)) this.grid[p.y][p.x] = terrain;
        }
        /** 该格本身能否被站立（不考虑单位占用）。 */


        isWalkable(p) {
          return this.inBounds(p) && this.profileAt(p).walkable;
        }
        /** 位移是否会在此格停止（墙/障碍/边界）。 */


        blocksDisplacement(p) {
          if (!this.inBounds(p)) return true;
          return this.profileAt(p).blocksDisplacement;
        }

        forEachTile(fn) {
          for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) fn({
              x,
              y
            }, this.grid[y][x]);
          }
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=24f1174ddb89152415bd99e13891c910177a19cb.js.map