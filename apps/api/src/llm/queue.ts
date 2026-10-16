import { generationConcurrency } from "../lib/env";

class AsyncLimiter {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(operation: () => Promise<T>): Promise<T> {
    await new Promise<void>((resolve) => {
      if (this.active < this.limit) {
        this.active += 1;
        resolve();
        return;
      }
      this.waiting.push(() => {
        this.active += 1;
        resolve();
      });
    });

    try {
      return await operation();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }
}

/**
 * Both room jobs and individual OpenAI calls are limited. The second limiter is
 * important because the script stage intentionally creates one call per player.
 */
export class GenerationQueue {
  private readonly jobs: Array<() => Promise<void>> = [];
  private runningWorkers = 0;
  private readonly modelCalls: AsyncLimiter;

  constructor(private readonly concurrency: number) {
    this.modelCalls = new AsyncLimiter(concurrency);
  }

  enqueue(job: () => Promise<void>): void {
    this.jobs.push(job);
    this.drain();
  }

  runModelCall<T>(operation: () => Promise<T>): Promise<T> {
    return this.modelCalls.run(operation);
  }

  private drain(): void {
    while (this.runningWorkers < this.concurrency && this.jobs.length > 0) {
      const job = this.jobs.shift();
      if (!job) return;
      this.runningWorkers += 1;
      void job()
        // Job-level persistence records failures. Avoid logging request/model data.
        .catch(() => undefined)
        .finally(() => {
          this.runningWorkers -= 1;
          this.drain();
        });
    }
  }
}

export const generationQueue = new GenerationQueue(generationConcurrency);
