// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/** 元数据「注册表」：聚合所有养成/剧情数据表，作参数传给纯函数（类比 ContentRegistry）。 */
import { ProgressionTables } from "../leveling/Leveling";
import { ItemTable } from "../items/Items";
import { RewardTable } from "../rewards/Rewards";
import { StoryGraph } from "../story/StoryGraph";

export interface MetaTables {
  progression: ProgressionTables;
  items: ItemTable;
  levelRewards: RewardTable;
  story: StoryGraph;
}
