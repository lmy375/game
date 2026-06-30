/**
 * game-meta 统一出口：引擎无关的养成/存档/剧情逻辑。
 * 跨战斗的一切（等级、技能解锁、装备、剧情位置、存档）都在这一层；
 * 与 game-core 一样零引擎依赖、可单测。表现层与 campaign 编排层从这里引入。
 */
export * from "./profile/Profile";
export * from "./leveling/Leveling";
export * from "./items/Items";
export * from "./story/StoryGraph";
export * from "./save/MetaTables";
export * from "./save/SaveStore";
export * from "./rewards/Rewards";
export * from "./loadout/buildBattleState";
