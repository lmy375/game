# 微信小游戏构建（Project Formation）

本目录承载 PRD §18.1 / §19.5 要求的「微信小游戏构建验证」。

## 移植结论

战斗核心 `game-core` 是**纯 TypeScript**，不依赖任何浏览器 / Cocos API，可**原样**在微信小游戏运行时复用。需要适配的只有表现层：

| 模块 | Web 当前实现 | 微信小游戏适配 |
| --- | --- | --- |
| `game-core/**` | 纯 TS | ✅ 直接复用，无需改动 |
| `CanvasRenderer` | `canvas.getContext('2d')` | ✅ 改用 `wx.createCanvas()` 返回的 2D 上下文即可（API 一致） |
| 侧栏 UI（技能栏/日志/单位面板，HTML DOM） | DOM 元素 | ⚠ 需改写：用 Canvas 自绘 HUD，或用 WeChat `Button`/`open-data` 能力 |
| 输入 | `mousemove` / `click` | 改为 `wx.onTouchStart` / `wx.onTouchEnd`，命中测试逻辑（`cellFromPixel`）不变 |

> 由于 HUD 当前用 HTML DOM，完整的小游戏包需要把 HUD 改为 Canvas 自绘。这是表现层的工作量，**不触及战斗逻辑**——这正是 PRD §15 架构分层的目的。

## 构建步骤（需本机安装「微信开发者工具」）

1. 打包核心 + 渲染为单文件 JS：
   ```bash
   pnpm build              # 产出 dist/
   ```
2. 准备 `game.js` 入口（引入 `weapp-adapter` 提供 `document`/`canvas` 垫片）：
   ```js
   import './weapp-adapter.js'
   import { createRegistry, levels } from './game-core-bundle.js'
   const canvas = wx.createCanvas()
   // new CanvasRenderer(canvas, loadLevel(levels[0], createRegistry()))
   // 绑定 wx.onTouchStart -> renderer.cellFromPixel -> controller.tapCell
   ```
3. 用微信开发者工具打开本目录（已含 `game.json` / `project.config.json`），填入自己的 AppID，点击「预览 / 真机调试」。

## 性能（对应 PRD §20.4）

- 逻辑层纯 TS、零依赖，单局战斗状态体积极小（数十个对象），低端机无压力。
- 当前 Web 产物 gzip ≈ 13KB，远低于小游戏主包 4MB 限制。
- 美术为程序绘制（无大图），符合「轻量美术、远程加载」策略。
