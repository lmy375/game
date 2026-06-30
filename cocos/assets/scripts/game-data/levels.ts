// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
export default [
  {
    "id": "level_001",
    "name": "十字火焰教学",
    "teach": "先用「狂风聚拢」把敌人聚到一起，再用「十字火焰」一次爆发。",
    "board": {
      "width": 8,
      "height": 8,
      "tiles": [
        { "x": 4, "y": 6, "terrain": "wall" },
        { "x": 4, "y": 1, "terrain": "wall" },
        { "x": 6, "y": 4, "terrain": "obstacle" }
      ]
    },
    "playerUnits": [
      { "unitId": "wind_mage", "x": 1, "y": 2 },
      { "unitId": "fire_mage", "x": 1, "y": 5 }
    ],
    "enemyUnits": [
      { "unitId": "enemy_soldier", "x": 6, "y": 1 },
      { "unitId": "enemy_soldier", "x": 7, "y": 4 },
      { "unitId": "enemy_soldier", "x": 6, "y": 6 }
    ],
    "winCondition": { "type": "defeat_all_enemies" }
  },
  {
    "id": "level_002",
    "name": "直线贯穿教学",
    "teach": "用「横向推击」把敌人推成一列，再用「贯穿射击」一箭多杀。",
    "board": {
      "width": 8,
      "height": 10,
      "tiles": [
        { "x": 2, "y": 3, "terrain": "wall" },
        { "x": 2, "y": 4, "terrain": "wall" },
        { "x": 2, "y": 5, "terrain": "wall" },
        { "x": 2, "y": 6, "terrain": "wall" },
        { "x": 5, "y": 3, "terrain": "wall" },
        { "x": 5, "y": 4, "terrain": "wall" },
        { "x": 5, "y": 5, "terrain": "wall" },
        { "x": 5, "y": 6, "terrain": "wall" }
      ]
    },
    "playerUnits": [
      { "unitId": "lancer", "x": 3, "y": 1 },
      { "unitId": "wind_mage", "x": 4, "y": 1 }
    ],
    "enemyUnits": [
      { "unitId": "enemy_soldier", "x": 3, "y": 8 },
      { "unitId": "enemy_soldier", "x": 4, "y": 8 },
      { "unitId": "enemy_archer", "x": 3, "y": 7 },
      { "unitId": "enemy_archer", "x": 4, "y": 7 }
    ],
    "winCondition": { "type": "defeat_all_enemies" }
  },
  {
    "id": "level_003",
    "name": "陷阱与位移",
    "teach": "利用地形：把敌人推入火焰或陷阱，再用 AOE 收割。",
    "board": {
      "width": 10,
      "height": 10,
      "tiles": [
        { "x": 5, "y": 5, "terrain": "fire" },
        { "x": 5, "y": 6, "terrain": "fire" },
        { "x": 6, "y": 5, "terrain": "fire" },
        { "x": 3, "y": 3, "terrain": "trap" },
        { "x": 7, "y": 7, "terrain": "trap" },
        { "x": 2, "y": 6, "terrain": "trap" },
        { "x": 4, "y": 2, "terrain": "obstacle" },
        { "x": 6, "y": 8, "terrain": "obstacle" },
        { "x": 8, "y": 4, "terrain": "wall" },
        { "x": 8, "y": 5, "terrain": "wall" }
      ]
    },
    "playerUnits": [
      { "unitId": "wind_mage", "x": 1, "y": 1 },
      { "unitId": "fire_mage", "x": 1, "y": 3 },
      { "unitId": "lancer", "x": 1, "y": 5 }
    ],
    "enemyUnits": [
      { "unitId": "enemy_soldier", "x": 7, "y": 2 },
      { "unitId": "enemy_soldier", "x": 8, "y": 8 },
      { "unitId": "enemy_archer", "x": 9, "y": 5 },
      { "unitId": "enemy_archer", "x": 8, "y": 1 },
      { "unitId": "enemy_heavy", "x": 6, "y": 4 }
    ],
    "winCondition": { "type": "defeat_all_enemies" }
  }
] as const;
