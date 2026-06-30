import { Application, Container } from "pixi.js";

/**
 * Pixi 舞台:一个 Application + 分层容器(都挂在 world 下,便于整体做屏幕震动)。
 * 层序:board(地形) → overlay(高亮/箭头) → units(单位) → fx(粒子/飘字)。
 */
export class GameStage {
  readonly app = new Application();
  readonly world = new Container();
  readonly board = new Container();
  readonly overlay = new Container();
  readonly units = new Container();
  readonly fx = new Container();

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      width: 660,
      height: 520,
      background: 0x0a0c11,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.canvas);
    this.world.addChild(this.board, this.overlay, this.units, this.fx);
    this.app.stage.addChild(this.world);
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  resize(w: number, h: number): void {
    this.app.renderer.resize(w, h);
  }

  /** 清空一关的所有内容。 */
  clear(): void {
    for (const layer of [this.board, this.overlay, this.units, this.fx]) {
      layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    }
  }
}
