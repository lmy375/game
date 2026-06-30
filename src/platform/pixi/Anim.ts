import { Ticker } from "pixi.js";

type Update = (t: number) => void;
interface Job {
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

/** 基于 Pixi Ticker 的 Promise 补间,供 EventAnimator 串行 await。 */
export class Animator {
  private jobs: Job[] = [];

  constructor(ticker: Ticker) {
    ticker.add((tk) => this.step(tk.deltaMS / 1000));
  }

  private step(dt: number): void {
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i];
      j.elapsed += dt;
      const raw = j.dur <= 0 ? 1 : Math.min(1, j.elapsed / j.dur);
      j.update(j.easing(raw));
      if (raw >= 1) {
        this.jobs.splice(i, 1);
        j.resolve();
      }
    }
  }

  animate(dur: number, update: Update, easing: (t: number) => number = Easing.smooth): Promise<void> {
    return new Promise((resolve) => this.jobs.push({ elapsed: 0, dur, update, easing, resolve }));
  }
  wait(sec: number): Promise<void> {
    return this.animate(sec, () => {}, Easing.linear);
  }
}
