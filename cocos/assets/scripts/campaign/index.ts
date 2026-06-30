// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 流程编排层统一出口：引擎无关的 CampaignDirector 与其 ViewModel/Host 契约。
 * 各表现层实现 CampaignHost（标题/过场/结算/结局 + 把战斗交给已有战斗层），四套共享同一流程。
 */
export * from "./types";
export * from "./CampaignDirector";
