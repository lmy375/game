System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, _crd;

  function cloneUnit(u) {
    return {
      instanceId: u.instanceId,
      defId: u.defId,
      name: u.name,
      faction: u.faction,
      pos: {
        x: u.pos.x,
        y: u.pos.y
      },
      facing: u.facing,
      hp: u.hp,
      maxHp: u.maxHp,
      stats: { ...u.stats
      },
      skills: [...u.skills],
      statuses: u.statuses.map(s => ({ ...s
      })),
      movedThisTurn: u.movedThisTurn,
      actedThisTurn: u.actedThisTurn,
      cooldowns: { ...u.cooldowns
      },
      ct: u.ct,
      aiProfile: u.aiProfile
    };
  }

  function isAlive(u) {
    return u.hp > 0;
  }

  function hasStatus(u, id) {
    return u.statuses.some(s => s.id === id);
  }

  function _reportPossibleCrUseOfPosition(extras) {
    _reporterNs.report("Position", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfDirection(extras) {
    _reporterNs.report("Direction", "../board/geometry", _context.meta, extras);
  }

  _export({
    cloneUnit: cloneUnit,
    isAlive: isAlive,
    hasStatus: hasStatus
  });

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "87b1dvfalhB4btnbhHM21Pc", "Unit", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 单位定义与运行时实例。
       */

      /** 静态配置（来自 units.json）。 */

      /** 运行时单位实例（出现在 BattleState 中）。 */


      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=00cf37cea1255170fa581d9b998c5331932d2ed2.js.map