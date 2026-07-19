/** 元数据「注册表」：聚合所有养成/剧情数据表，作参数传给纯函数（类比 ContentRegistry）。 */
import { ItemTable } from "../items/Items";
import { RewardTable } from "../rewards/Rewards";
import { StoryGraph } from "../story/StoryGraph";

export interface MetaTables {
  items: ItemTable;
  levelRewards: RewardTable;
  story: StoryGraph;
}
