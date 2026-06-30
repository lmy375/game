// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 交互层统一出口：引擎无关的交互状态机与其 ViewModel/Host 契约。
 * 各表现层（web/three/pixi/cocos）实现 SessionHost，把「玩家怎么操作」的规则共享给所有表现层。
 */
export * from "./types";
export * from "./BattleSession";
