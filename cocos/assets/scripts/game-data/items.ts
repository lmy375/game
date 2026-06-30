// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
export default [
  {
    "id": "swift_charm",
    "name": "疾风护符",
    "kind": "equip",
    "description": "+15 速度，行动更频繁。",
    "bonus": [{ "stat": "speed", "amount": 15 }]
  },
  {
    "id": "iron_band",
    "name": "铁腕环",
    "kind": "equip",
    "description": "+3 攻击，+2 防御。",
    "bonus": [
      { "stat": "attack", "amount": 3 },
      { "stat": "defense", "amount": 2 }
    ]
  },
  {
    "id": "vitality_gem",
    "name": "活力宝石",
    "kind": "equip",
    "description": "+20 生命上限。",
    "bonus": [{ "stat": "hp", "amount": 20 }]
  },
  {
    "id": "minor_potion",
    "name": "初级药水",
    "kind": "consumable",
    "description": "（暂未实装战斗中使用）恢复 30 生命。",
    "effect": { "type": "heal", "amount": 30 }
  }
] as const;
