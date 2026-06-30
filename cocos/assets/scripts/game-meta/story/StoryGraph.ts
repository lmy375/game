// ⚠ 自动生成,勿手改。真源在 src/,运行 `pnpm sync:cocos` 重新同步。
/**
 * 剧情发展树：纯数据图 + 纯查询/推进函数。引擎无关，过场文本/立绘字形都是纯数据。
 */
export type StoryNodeKind = "title" | "cutscene" | "battle" | "result" | "ending";

interface BaseNode {
  id: string;
  kind: StoryNodeKind;
  /** 下一节点 id；null = 终点。 */
  next: string | null;
}

export interface CutsceneLine {
  speaker: string;
  /** 立绘字形（如 "风"/"火"/"枪"）；空串 = 旁白无立绘。 */
  glyph: string;
  text: string;
}

export interface TitleNode extends BaseNode {
  kind: "title";
  title: string;
  subtitle?: string;
}
export interface CutsceneNode extends BaseNode {
  kind: "cutscene";
  lines: CutsceneLine[];
}
export interface BattleNode extends BaseNode {
  kind: "battle";
  levelId: string;
}
export interface ResultNode extends BaseNode {
  kind: "result";
}
export interface EndingNode extends BaseNode {
  kind: "ending";
  title: string;
  lines: string[];
}

export type StoryNode = TitleNode | CutsceneNode | BattleNode | ResultNode | EndingNode;

export interface StoryGraph {
  startId: string;
  nodes: Record<string, StoryNode>;
}

export function nodeById(graph: StoryGraph, id: string): StoryNode {
  const n = graph.nodes[id];
  if (!n) throw new Error(`未知剧情节点: ${id}`);
  return n;
}

export function advance(graph: StoryGraph, id: string): string | null {
  return nodeById(graph, id).next;
}

export function isTerminal(graph: StoryGraph, id: string): boolean {
  const n = nodeById(graph, id);
  return n.kind === "ending" || n.next === null;
}
