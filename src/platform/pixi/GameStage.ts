import { Application, Container, Sprite, Texture } from "pixi.js";
import { battleBackgroundUrls } from "./AssetManifest";

export interface BoardPlacement {
  scale: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Pixi 舞台:一个 Application + 分层容器(都挂在 world 下,便于整体做屏幕震动)。
 * 层序:board(地形) → overlay(高亮/箭头) → units(单位) → fx(粒子/飘字)。
 */
export class GameStage {
  readonly app = new Application();
  readonly background = Sprite.from(battleBackgroundUrls.default);
  readonly world = new Container();
  readonly board = new Container();
  readonly overlay = new Container();
  readonly units = new Container();
  readonly fx = new Container();
  private host!: HTMLElement;

  async init(host: HTMLElement): Promise<void> {
    this.host = host;
    await this.app.init({
      width: 960,
      height: 640,
      background: 0x0a0c11,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2),
      autoDensity: true,
    });
    host.appendChild(this.app.canvas);
    this.app.canvas.style.width = "100%";
    this.app.canvas.style.height = "100%";
    this.background.alpha = 0.88;
    this.app.stage.addChild(this.background, this.world);
    this.world.addChild(this.board, this.overlay, this.units, this.fx);
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  setBackground(url: string): void {
    this.background.texture = Texture.from(url);
    this.fitBackground(this.app.screen.width, this.app.screen.height);
  }

  resize(w: number, h: number): void {
    this.app.renderer.resize(w, h);
    this.app.canvas.style.width = "100%";
    this.app.canvas.style.height = "100%";
    this.fitBackground(w, h);
  }

  resizeForBoard(boardW: number, boardH: number): BoardPlacement {
    const rect = this.host.getBoundingClientRect();
    const width = Math.max(360, Math.floor(rect.width || boardW));
    const height = Math.max(420, Math.floor(rect.height || boardH));
    this.resize(width, height);

    const scale = Math.min((width * 0.92) / boardW, (height * 0.82) / boardH);
    const boardWidth = boardW * scale;
    const boardHeight = boardH * scale;
    return {
      scale,
      x: (width - boardWidth) / 2,
      y: Math.max(16, (height - boardHeight) / 2 + height * 0.035),
      width,
      height,
    };
  }

  private fitBackground(w: number, h: number): void {
    const tex = this.background.texture;
    const scale = Math.max(w / tex.width, h / tex.height);
    this.background.scale.set(scale);
    this.background.position.set((w - tex.width * scale) / 2, (h - tex.height * scale) / 2);
  }

  /** 清空一关的所有内容。 */
  clear(): void {
    for (const layer of [this.board, this.overlay, this.units, this.fx]) {
      layer.removeChildren().forEach((c) => c.destroy({ children: true }));
    }
  }
}
