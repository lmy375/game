System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, _crd, TERRAIN, TERRAIN_DAMAGE;

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "196e7T67PpMSI4NSepTXmMT", "terrain", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 地形定义。MVP 实现：普通地面、墙体、障碍物、火焰地形、陷阱格。
       */


      _export("TERRAIN", TERRAIN = {
        ground: {
          type: "ground",
          blocksMove: false,
          walkable: true,
          blocksDisplacement: false,
          triggersOnEnter: false,
          destructible: false
        },
        wall: {
          type: "wall",
          blocksMove: true,
          walkable: false,
          blocksDisplacement: true,
          triggersOnEnter: false,
          destructible: false
        },
        obstacle: {
          type: "obstacle",
          blocksMove: true,
          walkable: false,
          blocksDisplacement: true,
          triggersOnEnter: false,
          destructible: true
        },
        fire: {
          type: "fire",
          blocksMove: false,
          walkable: true,
          blocksDisplacement: false,
          triggersOnEnter: true,
          destructible: false
        },
        trap: {
          type: "trap",
          blocksMove: false,
          walkable: true,
          blocksDisplacement: false,
          triggersOnEnter: true,
          destructible: false
        }
      });
      /** 地形进入/停留时造成的固定伤害（MVP 简化）。 */


      _export("TERRAIN_DAMAGE", TERRAIN_DAMAGE = {
        fire: 20,
        trap: 35
      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=be233c763d157307a3e76b08d78861de4496c692.js.map