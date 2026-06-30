System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, _crd;

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "e81da+cHzxGz4W1SlgjWnz4", "units", undefined);

      // ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
      _export("default", [{
        "id": "wind_mage",
        "name": "风术士",
        "faction": "player",
        "stats": {
          "hp": 100,
          "attack": 20,
          "magic": 30,
          "defense": 8,
          "moveRange": 4,
          "speed": 60
        },
        "skills": ["normal_attack", "gale_gather", "push_wave"]
      }, {
        "id": "fire_mage",
        "name": "火法师",
        "faction": "player",
        "stats": {
          "hp": 90,
          "attack": 16,
          "magic": 34,
          "defense": 7,
          "moveRange": 3,
          "speed": 45
        },
        "skills": ["normal_attack", "cross_fire"]
      }, {
        "id": "lancer",
        "name": "枪兵",
        "faction": "player",
        "stats": {
          "hp": 110,
          "attack": 28,
          "magic": 8,
          "defense": 10,
          "moveRange": 4,
          "speed": 55
        },
        "skills": ["normal_attack", "pierce_shot", "swap_skill"]
      }, {
        "id": "enemy_soldier",
        "name": "近战兵",
        "faction": "enemy",
        "aiProfile": "melee",
        "stats": {
          "hp": 80,
          "attack": 18,
          "magic": 0,
          "defense": 6,
          "moveRange": 3,
          "speed": 50
        },
        "skills": ["normal_attack"]
      }, {
        "id": "enemy_archer",
        "name": "远程兵",
        "faction": "enemy",
        "aiProfile": "ranged",
        "stats": {
          "hp": 55,
          "attack": 16,
          "magic": 0,
          "defense": 3,
          "moveRange": 3,
          "speed": 70
        },
        "skills": ["ranged_shot", "normal_attack"]
      }, {
        "id": "enemy_heavy",
        "name": "重甲兵",
        "faction": "enemy",
        "aiProfile": "tank",
        "stats": {
          "hp": 140,
          "attack": 22,
          "magic": 0,
          "defense": 12,
          "moveRange": 2,
          "speed": 30
        },
        "skills": ["normal_attack"]
      }]);

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=aeb7a1eba93bec9975c4c51390278b3c70328d94.js.map