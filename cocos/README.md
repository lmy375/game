# 阵形之术 · Cocos 2.5D 表现层

在 **Cocos Creator 3.8.x** 里为「阵形之术」做的 2.5D 表现层:3D 倾斜俯视棋盘 + 光影、2D 立绘单位、事件驱动的技能补间与程序化粒子特效。

战斗内核(`src/game-core`)与数据(`src/game-data`)是**单一真源**,本工程复用它们、**零改动**。

---

## 它是怎么组织的

```
cocos/
  assets/scripts/
    bootstrap/Bootstrap.ts   入口组件:代码搭起相机/光/Canvas,装配所有 View 与控制器
    core/CoordMap.ts         逻辑格 ↔ 3D 世界坐标
    core/types.ts            Overlay 叠加层数据结构
    view/SceneRig.ts         3D 相机 + UI 相机 + 方向光 + Canvas(全部代码生成)
    view/BoardView.ts        3D 棋盘:地形格、墙体加高、火/陷阱自发光、阴影
    view/UnitView.ts         2D 立绘单位(Graphics 程序化绘制),按世界坐标投影到屏幕
    view/OverlayView.ts      贴地高亮(移动/施法/AOE/危险)+ 位移箭头 + 预览数字
    view/HudView.ts          回合提示、行动顺序、名册、日志、技能菜单、确认条、横幅
    anim/SkillEffects.ts     程序化粒子:迸射/光环/弹道(无美术资源)
    anim/EventAnimator.ts    ★ 消费 BattleEvent[],串行播放补间+粒子
    input/InputController.ts 相机射线拾取格 + 交互状态机(移植自 web BattleController)
    game-core/  (自动生成)   来自 src/game-core —— 勿手改
    game-data/  (自动生成)   来自 src/game-data —— 勿手改
  scripts/sync-core.mjs      把 src/ 的内核与数据同步进 assets/scripts
  typings/cc.d.ts            离线 cc 类型 shim(仅供仓库内 tsc,编辑器用自己的类型)
```

**架构要点**:3D 世界承载棋盘/地形/光照/高亮;2D UI(Canvas)承载单位立绘、血条、飘字、HUD,
通过 `camera.convertToUINode` 把棋盘世界坐标投影到屏幕。既有 3D 透视场景,又有干净的 2D 角色。

---

## 首次运行(约 1 分钟)

1. **同步内核**(在仓库根目录):
   ```bash
   pnpm sync:cocos
   ```
   生成 `cocos/assets/scripts/game-core` 与 `game-data`。每次改了 `src/` 的内核/数据后重跑。

2. 用 **Cocos Creator 3.8.x** 打开 `cocos/` 目录(首次会导入并生成 `library/`、各资源 `.meta`)。

3. **建一个启动场景**(脚本把所有内容都在代码里生成,所以场景只需一个挂载点):
   - 资源管理器 → 在 `assets/` 右键 → 新建 → Scene,命名 `main`。
   - 在层级管理器里**新建一个空节点**(右键 → 创建 → 空节点),改名 `Bootstrap`。
   - 选中该节点 → 属性检查器 → 添加组件 → 自定义脚本 → `Bootstrap`。
   - `Ctrl/Cmd + S` 保存场景。

4. 点编辑器顶部的 **▶ 预览(Play)**。

预期:深色背景上一块 3D 倾斜棋盘(地形分色、墙体凸起、火/陷阱发光),双方 2D 立绘单位站在格上;
鼠标悬停高亮、点击走位、点单位展开技能菜单、瞄准时显示 AOE/伤害预览,释放技能播放粒子与位移补间,
敌方 AI 自动行动。数字键 **1 / 2 / 3** 切换三个关卡。

> 若 `main.scene` 因引擎版本差异加载异常,删掉重做第 3 步即可——所有逻辑都在脚本里,不依赖场景内容。

---

## 验证

- **逻辑回归**(仓库根):`pnpm test` —— 内核未改,34 个 vitest 全绿。
- **脚本类型检查**:`pnpm typecheck:cocos` —— 先同步再用 `cocos/tsconfig.cocos.json` 跑 `tsc`(依赖 `typings/cc.d.ts` 离线 shim)。

---

## 换成正式美术(后续)

当前是**程序化占位**(几何体棋盘 + Graphics 立绘 + 代码粒子)。要精修:

- **单位立绘**:在 `UnitView` 里把 `UnitSprite` 的 `Graphics` 换成 `Sprite`/Spine 骨骼;投影逻辑不变。
- **场景**:把 `BoardView` 的 primitive box 换成导入的 3D 地块模型/材质。
- **技能特效**:把 `SkillEffects` 的代码粒子换成编辑器里做的 `ParticleSystem` 预制体,按 `skillId` 实例化。
- **替换点都集中在 `view/` 与 `anim/`,不触碰 `InputController` 与内核。**
