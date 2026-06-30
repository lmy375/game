System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, GridBoard, initInitiative, _crd;

  function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

  function loadLevel(level, registry) {
    var board = (_crd && GridBoard === void 0 ? (_reportPossibleCrUseOfGridBoard({
      error: Error()
    }), GridBoard) : GridBoard).from(level.board);
    var units = [];

    var place = (p, idx) => {
      var def = registry.unit(p.unitId);
      var unit = {
        instanceId: (def.faction === "player" ? "p" : "e") + "_" + def.id + "_" + idx,
        defId: def.id,
        name: def.name,
        faction: def.faction,
        pos: {
          x: p.x,
          y: p.y
        },
        facing: def.faction === "player" ? "right" : "left",
        hp: def.stats.hp,
        maxHp: def.stats.hp,
        stats: _extends({}, def.stats),
        skills: [...def.skills],
        statuses: [],
        movedThisTurn: false,
        actedThisTurn: false,
        cooldowns: {},
        ct: 0,
        aiProfile: def.aiProfile
      };
      units.push(unit);
    };

    level.playerUnits.forEach((p, i) => place(p, i));
    level.enemyUnits.forEach((p, i) => place(p, i));
    var state = {
      board,
      units,
      turn: "player",
      activeUnitId: null,
      turnCount: 0,
      outcome: null
    }; // 按速度选出首个行动单位

    (_crd && initInitiative === void 0 ? (_reportPossibleCrUseOfinitInitiative({
      error: Error()
    }), initInitiative) : initInitiative)(state);
    return state;
  }

  function _reportPossibleCrUseOfGridBoard(extras) {
    _reporterNs.report("GridBoard", "../board/GridBoard", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTerrainType(extras) {
    _reporterNs.report("TerrainType", "../board/terrain", _context.meta, extras);
  }

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnit(extras) {
    _reporterNs.report("Unit", "../unit/Unit", _context.meta, extras);
  }

  function _reportPossibleCrUseOfContentRegistry(extras) {
    _reporterNs.report("ContentRegistry", "./Registry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfinitInitiative(extras) {
    _reporterNs.report("initInitiative", "../turn/turn", _context.meta, extras);
  }

  _export("loadLevel", loadLevel);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      GridBoard = _unresolved_2.GridBoard;
    }, function (_unresolved_3) {
      initInitiative = _unresolved_3.initInitiative;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "3013cCSMKdF/7mHNpF/INbj", "Level", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 关卡定义与加载。loadLevel 是纯函数：LevelDef + Registry -> 初始 BattleState。
       */


      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=6fd4ae0ef07ac075c3d24780b14133457ac871ca.js.map