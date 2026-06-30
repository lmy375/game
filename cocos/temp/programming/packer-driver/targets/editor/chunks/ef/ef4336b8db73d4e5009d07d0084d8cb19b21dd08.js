System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, livingUnits, manhattan, _crd, DEFAULT_WEIGHTS;

  function evaluateForEnemy(state, w = DEFAULT_WEIGHTS) {
    const enemies = (_crd && livingUnits === void 0 ? (_reportPossibleCrUseOflivingUnits({
      error: Error()
    }), livingUnits) : livingUnits)(state, "enemy");
    const players = (_crd && livingUnits === void 0 ? (_reportPossibleCrUseOflivingUnits({
      error: Error()
    }), livingUnits) : livingUnits)(state, "player");
    let score = 0;
    score += w.enemyAlive * enemies.length;
    score += w.enemyHp * sumHp(enemies);
    score -= w.playerAlive * players.length;
    score -= w.playerHp * sumHp(players); // 扎堆惩罚：任意两敌人曼哈顿距离 <=1

    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        if ((_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
          error: Error()
        }), manhattan) : manhattan)(enemies[i].pos, enemies[j].pos) <= 1) score -= w.clusterPenalty;
      }
    } // 直线惩罚：三个敌人在同一行/列且彼此较近


    score -= w.linePenalty * countLinedTriples(enemies); // 危险地形

    for (const e of enemies) {
      if (isHazard(state, e.pos)) score -= w.onHazard;else if (adjacentToHazard(state, e.pos)) score -= w.nearHazard; // 残血暴露：低血量且贴近玩家

      if (e.hp / e.maxHp < 0.35 && players.some(p => (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
        error: Error()
      }), manhattan) : manhattan)(p.pos, e.pos) <= 1)) {
        score -= w.lowHpExposed;
      }
    }

    return score;
  }

  function sumHp(units) {
    return units.reduce((s, u) => s + u.hp, 0);
  }

  function isHazard(state, p) {
    const t = state.board.terrainAt(p);
    return t === "fire" || t === "trap";
  }

  function adjacentToHazard(state, p) {
    return isHazard(state, {
      x: p.x + 1,
      y: p.y
    }) || isHazard(state, {
      x: p.x - 1,
      y: p.y
    }) || isHazard(state, {
      x: p.x,
      y: p.y + 1
    }) || isHazard(state, {
      x: p.x,
      y: p.y - 1
    });
  }
  /** 统计「同一行/列且两两间距<=3」的敌人三元组数量。 */


  function countLinedTriples(enemies) {
    let count = 0;

    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        for (let k = j + 1; k < enemies.length; k++) {
          const a = enemies[i].pos;
          const b = enemies[j].pos;
          const c = enemies[k].pos;
          const sameRow = a.y === b.y && b.y === c.y;
          const sameCol = a.x === b.x && b.x === c.x;
          if (!sameRow && !sameCol) continue;
          const near = (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
            error: Error()
          }), manhattan) : manhattan)(a, b) <= 3 && (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
            error: Error()
          }), manhattan) : manhattan)(b, c) <= 3 && (_crd && manhattan === void 0 ? (_reportPossibleCrUseOfmanhattan({
            error: Error()
          }), manhattan) : manhattan)(a, c) <= 4;
          if (near) count++;
        }
      }
    }

    return count;
  }

  function _reportPossibleCrUseOfBattleState(extras) {
    _reporterNs.report("BattleState", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOflivingUnits(extras) {
    _reporterNs.report("livingUnits", "../state/BattleState", _context.meta, extras);
  }

  function _reportPossibleCrUseOfmanhattan(extras) {
    _reporterNs.report("manhattan", "../board/geometry", _context.meta, extras);
  }

  function _reportPossibleCrUseOfUnit(extras) {
    _reporterNs.report("Unit", "../unit/Unit", _context.meta, extras);
  }

  _export("evaluateForEnemy", evaluateForEnemy);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }, function (_unresolved_2) {
      livingUnits = _unresolved_2.livingUnits;
    }, function (_unresolved_3) {
      manhattan = _unresolved_3.manhattan;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "f3663QcWVBCKoJVLWXeTJDx", "BattleEvaluator", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 战斗评分器：从敌方视角给战斗状态打分。分越高对敌方越有利。
       * 关键：内置「扎堆惩罚」「直线惩罚」「危险地形惩罚」，让敌人不愿成为 AOE 靶子（PRD 10/20.3）。
       */


      _export("DEFAULT_WEIGHTS", DEFAULT_WEIGHTS = {
        enemyAlive: 60,
        enemyHp: 1,
        playerAlive: 80,
        playerHp: 2,
        clusterPenalty: 18,
        linePenalty: 22,
        onHazard: 30,
        nearHazard: 8,
        lowHpExposed: 20
      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=ef4336b8db73d4e5009d07d0084d8cb19b21dd08.js.map