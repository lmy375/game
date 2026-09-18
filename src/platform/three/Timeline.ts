interface Tween { elapsed: number; duration: number; update: (t: number) => void; resolve: (completed: boolean) => void }

/** Driven by the render clock: cancellation settles awaiters when levels change. */
export class Timeline {
  private tweens = new Set<Tween>();
  animate(duration: number, update: (t: number) => void = () => {}): Promise<boolean> {
    update(0);
    return new Promise((resolve) => this.tweens.add({ elapsed: 0, duration: Math.max(duration, 0.001), update, resolve }));
  }
  tick(delta: number): void {
    for (const tween of this.tweens) {
      tween.elapsed += delta;
      const t = Math.min(1, tween.elapsed / tween.duration);
      tween.update(t);
      if (t === 1) { this.tweens.delete(tween); tween.resolve(true); }
    }
  }
  cancel(): void {
    for (const tween of this.tweens) tween.resolve(false);
    this.tweens.clear();
  }
}
