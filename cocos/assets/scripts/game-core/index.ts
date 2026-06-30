// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * game-core 对外统一出口。表现层（Web/Cocos）与测试只从这里引入。
 * 该层不依赖任何引擎与具体数据文件。
 */
export * from "./board/geometry";
export * from "./board/terrain";
export * from "./board/GridBoard";
export * from "./unit/Unit";
export * from "./state/BattleState";
export * from "./state/events";
export * from "./pattern/Pattern";
export * from "./skill/Skill";
export * from "./skill/combat";
export * from "./skill/resolveSkill";
export * from "./displacement/displacement";
export * from "./pathfinding/pathfinding";
export * from "./content/Registry";
export * from "./content/Level";
export * from "./turn/turn";
export * from "./simulator/BattleSimulator";
export * from "./simulator/preview";
export * from "./evaluator/BattleEvaluator";
export * from "./ai/EnemyAI";
