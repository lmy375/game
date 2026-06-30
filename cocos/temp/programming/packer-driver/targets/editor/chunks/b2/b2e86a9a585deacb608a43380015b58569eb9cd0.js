System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, _crd, ALL_DIRECTIONS, DIRECTION_VECTOR;

  function eq(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function add(a, b) {
    return {
      x: a.x + b.x,
      y: a.y + b.y
    };
  }

  function sub(a, b) {
    return {
      x: a.x - b.x,
      y: a.y - b.y
    };
  }

  function scale(a, k) {
    return {
      x: a.x * k,
      y: a.y * k
    };
  }
  /** 曼哈顿距离 */


  function manhattan(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }
  /** 切比雪夫距离（八方向） */


  function chebyshev(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  }

  function key(p) {
    return `${p.x},${p.y}`;
  }

  function clone(p) {
    return {
      x: p.x,
      y: p.y
    };
  }
  /** 从一个位置指向另一个位置的主方向（四方向）。用于换位/推动时推断方向。 */


  function directionTo(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? "right" : "left";
    }

    return dy >= 0 ? "up" : "down";
  }

  function opposite(dir) {
    switch (dir) {
      case "up":
        return "down";

      case "down":
        return "up";

      case "left":
        return "right";

      case "right":
        return "left";
    }
  }

  _export({
    eq: eq,
    add: add,
    sub: sub,
    scale: scale,
    manhattan: manhattan,
    chebyshev: chebyshev,
    key: key,
    clone: clone,
    directionTo: directionTo,
    opposite: opposite
  });

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "07a6eIRNRJLuoSOHrACJIiQ", "geometry", undefined); // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。

      /**
       * 基础几何类型与运算。纯函数，不依赖任何引擎。
       */


      _export("ALL_DIRECTIONS", ALL_DIRECTIONS = ["up", "down", "left", "right"]);
      /** 方向对应的单位向量。约定：y 向上为正。 */


      _export("DIRECTION_VECTOR", DIRECTION_VECTOR = {
        up: {
          x: 0,
          y: 1
        },
        down: {
          x: 0,
          y: -1
        },
        left: {
          x: -1,
          y: 0
        },
        right: {
          x: 1,
          y: 0
        }
      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=b2e86a9a585deacb608a43380015b58569eb9cd0.js.map