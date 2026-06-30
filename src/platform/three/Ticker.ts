type FrameCb = () => void;
type Update = (t: number) => void;

interface Anim {
  elapsed: number;
  dur: number;
  update: Update;
  easing: (t: number) => number;
  resolve: () => void;
}

export const Easing = {
  linear: (t: number) => t,
  quadOut: (t: number) => 1 - (1 - t) * (1 - t),
  quadIn: (t: number) => t * t,
  smooth: (t: number) => t * t * (3 - 2 * t),
  backOut: (t: number) => {
    const c = 1.70158;
    const u = t - 1;
    return 1 + (c + 1) * u * u * u + c * u * u;
  },
};

/**
 * 单一 requestAnimationFrame 主循环:每帧推进所有补间,再调用 onFrame 回调
 * (投影单位、渲染场景)。补间以 Promise 形式提供,便于 EventAnimator 串行 await。
 */
export class Ticker {
  private anims: Anim[] = [];
  private frameCbs: FrameCb[] = [];
  private last = 0;
  private running = false;

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = (now: number) => {
      if (!this.running) return;
      const dt = this.last ? (now - this.last) / 1000 : 0;
      this.last = now;
      this.step(Math.min(dt, 0.05));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  onFrame(cb: FrameCb): void {
    this.frameCbs.push(cb);
  }

  private step(dt: number): void {
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i];
      a.elapsed += dt;
      const raw = a.dur <= 0 ? 1 : Math.min(1, a.elapsed / a.dur);
      a.update(a.easing(raw));
      if (raw >= 1) {
        this.anims.splice(i, 1);
        a.resolve();
      }
    }
    for (const cb of this.frameCbs) cb();
  }

  /** 在 dur 秒内反复调用 update(eased 0→1),完成后 resolve。 */
  animate(dur: number, update: Update, easing: (t: number) => number = Easing.smooth): Promise<void> {
    return new Promise((resolve) => this.anims.push({ elapsed: 0, dur, update, easing, resolve }));
  }

  wait(sec: number): Promise<void> {
    return this.animate(sec, () => {}, Easing.linear);
  }
}
