// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
export default {
  "xpCurve": {
    "maxLevel": 5,
    "xpToReach": [0, 0, 100, 250, 450, 700]
  },
  "growth": {
    "wind_mage": { "hp": 8, "magic": 4, "attack": 1, "speed": 1 },
    "fire_mage": { "hp": 6, "magic": 5, "speed": 1 },
    "lancer": { "hp": 12, "attack": 3, "defense": 1 }
  },
  "unlocks": {
    "wind_mage": [{ "level": 2, "skill": "push_wave" }],
    "fire_mage": [],
    "lancer": [
      { "level": 2, "skill": "pierce_shot" },
      { "level": 3, "skill": "swap_skill" }
    ]
  }
} as const;
