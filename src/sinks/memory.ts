import type { Crumb, Sink } from "../types.js";

export class MemorySink implements Sink {
  entries: Crumb[] = [];

  write(crumb: Crumb): void {
    this.entries.push(crumb);
  }

  clear(): void {
    this.entries.length = 0;
  }

  find(predicate: (crumb: Crumb) => boolean): Crumb | undefined {
    return this.entries.find(predicate);
  }

  filter(predicate: (crumb: Crumb) => boolean): Crumb[] {
    return this.entries.filter(predicate);
  }

  waitFor(
    predicate: (crumb: Crumb) => boolean,
    timeout = 5000
  ): Promise<Crumb> {
    const existing = this.find(predicate);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`waitFor timed out after ${timeout}ms`));
      }, timeout);

      const origWrite = this.write.bind(this);
      this.write = (crumb: Crumb) => {
        origWrite(crumb);
        if (predicate(crumb)) {
          clearTimeout(timer);
          this.write = origWrite;
          resolve(crumb);
        }
      };
    });
  }
}
