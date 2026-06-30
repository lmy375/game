# 阵形之术 · Project Formation (MVP)

回合制战棋策略游戏。核心乐趣：**改变站位 → 制造 AOE 最大收益**。
本仓库按 [docs/PRD.md](docs/PRD.md) 实现 MVP，可在浏览器直接游玩。

> 架构遵循 PRD §15 / §20.5：战斗逻辑为**纯 TypeScript**（`game-core`），不依赖任何引擎；
> 玩家操作（`interaction`）、养成/剧情（`game-meta` + `campaign`）也都是引擎无关的纯逻辑；
> 表现层（**PixiJS 2D**，DOM HUD）只消费 `BattleState` / `BattleEvent` 与各层的 ViewModel，因此可平滑移植到其它引擎或小游戏平台。

## 快速开始

本项目使用 **pnpm** 管理依赖。

```bash
pnpm install
pnpm dev          # 启动 PixiJS 表现层，打开终端给出的本地地址即可游玩
pnpm test         # 58 个测试（内核 / 交互 / 养成 / 流程）
pnpm typecheck    # 严格模式类型检查
pnpm build        # 生产构建（PixiJS 运行时，~108KB gzip）
```

> 表现层只保留 **PixiJS**（web Canvas / Three.js 2.5D / Cocos 已下线）。
> `game-core`/`interaction`/`game-meta`/`campaign` 为引擎无关纯逻辑，若要新增表现层只需实现 `SessionHost` 与 `CampaignHost`。

## 怎么玩

0. 启动进入**标题页** → 「新游戏」沿剧情流程走：过场 → 战斗 → 升级/掉落结算 → 过场 → 战斗 → 结局（Demo）。顶部下拉为**调试**入口，可直接载入任一关卡。
1. 右侧「行动顺序」显示按**速度**排出的出手序列。
2. 行动顺序按**速度初动（CT）**系统：速度越高出手越频繁（速度 80 的单位行动次数约为速度 40 的两倍）。同一时刻只有一个单位行动，轮到的我方单位会自动选中并显示**蓝色**可移动范围。
3. 移动与技能**顺序自由**（可先移后攻，也可先攻后移）。移动为**暂定**：未确认前可「↩ 撤销移动」重选落点。
4. 技能菜单不默认弹出（避免遮挡棋盘）——**移动后**或**点击该单位自身**时展开。
5. **黄色**= 施法范围，鼠标移到目标点显示 **橙/红色** AOE 命中、伤害数字、位移箭头、撞墙/陷阱提示。技能必须命中有效目标才能「✓ 释放」（禁止空放）。
6. 单位行动完毕（移动+技能用尽，或点「结束行动」）即自动轮到下一个单位。击败所有敌人获胜。

核心循环：**观察站位 → 改造站位（聚拢/推击/换位）→ 释放 AOE → 处理残局**。

## 目录结构

```
src/
  game-core/            # 纯 TS 战斗内核（无引擎依赖，可单测）
    board/              # 坐标、方向、地形、GridBoard
    unit/               # 单位定义与运行时实例
    state/              # BattleState、BattleEvent
    pattern/            # 命中形状 + 旋转算法
    skill/              # 技能定义、命中解析、伤害/状态/地形结算
    displacement/       # 位移：push/pull/gather/swap/lineup/knockback
    pathfinding/        # 移动范围 BFS + A* 寻路
    turn/               # 回合管理、状态结算（燃烧/眩晕/冷却）
    simulator/          # BattleSimulator（纯函数）+ 预览系统
    evaluator/          # 敌方评分器（扎堆/直线/危险地形惩罚）
    ai/                 # 敌人 AI（复用模拟器枚举+评分）
    content/            # 内容注册表、关卡加载
  game-data/            # 数据驱动配置（JSON）：patterns/skills/units/levels + 养成/剧情数据
  game-meta/            # 跨战斗纯逻辑：等级/技能解锁/装备/奖励/存档/剧情图
  interaction/          # 引擎无关的玩家操作状态机（BattleSession → ViewModel/SessionHost）
  campaign/             # 流程编排（CampaignDirector → 标题/过场/战斗/结算/结局）
  platform/
    pixi/               # 唯一表现层：PixiJS 2D 渲染 + 输入控制器（实现 SessionHost）
    _shared/            # 共用 DOM HUD / 屏幕 / localStorage 存档
    wechat/             # 微信小游戏移植说明（占位）
tests/                  # vitest 测试
```

## 已实现（对照 PRD MVP §18.1）

| PRD 要求 | 状态 |
| --- | --- |
| 1 个可运行战斗场景 | ✅ PixiJS 2D |
| 3 个我方角色（风术士/火法师/枪兵） | ✅ |
| 3 类敌人（近战/远程/重甲） | ✅ |
| 3 个教学关卡 | ✅ 十字火焰 / 直线贯穿 / 陷阱位移 |
| 6 个核心技能 | ✅ 普攻/十字火焰/贯穿射击/狂风聚拢/横向推击/换位术 |
| AOE Pattern 系统（含旋转、分格效果） | ✅ |
| 位移系统（撞墙/陷阱/火焰触发） | ✅ |
| 预览系统（伤害/位移/落点/可击杀） | ✅ 释放前完整预览 |
| 基础敌人 AI（不无脑扎堆） | ✅ 评分函数 + 扎堆/直线惩罚 |
| PixiJS 构建 | ✅ |

地形 MVP：普通地面 / 墙体 / 障碍物 / 火焰 / 陷阱（PRD §4.2）。

## 设计要点

- **纯函数模拟器**：`simulate(state, action) → { nextState, events }` 不修改输入。
  预览 = 在克隆态上跑同一套模拟（`previewSkill`），所以「所见即所得」。
- **事件驱动表现**：结算只产出 `BattleEvent`，渲染层据此画伤害数字/箭头/动画。
- **数据驱动**：技能/形状/单位/关卡全部 JSON 配置，新增内容无需改逻辑。
- **速度初动（CT）行动顺序**：每个单位按 `speed` 充能，达阈值即行动、行动后扣除阈值，速度越高出手越频繁（见 `game-core/turn/turn.ts`）。
- **AI 复用内核**：敌人 AI 用同一个 `BattleSimulator` 枚举行动、用 `BattleEvaluator` 打分，
  内置「扎堆惩罚 / 直线惩罚 / 危险地形惩罚」，避免敌人主动送 AOE。

## 后续（PRD §21）

扇形/环形 Pattern、八方向旋转、更多位移机制、地形扩展、连招评分系统、战斗中消耗品使用。
当前架构已为这些扩展预留接口。
