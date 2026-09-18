/**
 * Synthesis Request Queue with Deduplication
 * Prevents duplicate concurrent requests for the same synthesis
 */

export interface QueuedRequest {
  key: string;
  fn: () => Promise<any>;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  goal?: string;
}

type QueueListener = () => void;

class SynthesisQueue {
  private queue: QueuedRequest[] = [];
  private inFlight = new Map<string, Promise<any>>();
  private processing = false;
  private deduplicatedCount = 0;
  private listeners = new Set<QueueListener>();

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (e) {
        console.warn('Queue listener error:', e);
      }
    });
  }

  /**
   * Enqueue a synthesis request with deduplication.
   * If a request with the same key is already in-flight, return that exact Promise.
   */
  async enqueue(
    key: string,
    arg2: any,
    arg3?: any,
    arg4?: any,
    arg5?: any
  ): Promise<any> {
    // Check if an in-flight promise already exists for this exact key
    if (this.inFlight.has(key)) {
      this.deduplicatedCount++;
      console.log(`⏳ [Deduplication] Request "${key.slice(0, 16)}" is already running. Sharing in-flight result.`);
      this.notify();
      return this.inFlight.get(key);
    }

    // Resolve the actual synthesizer callback whether called as (key, fn) or (key, ingredients, actions, goal, fn)
    let fn: () => Promise<any>;
    let goal: string | undefined;

    if (typeof arg2 === 'function') {
      fn = arg2;
    } else if (typeof arg5 === 'function') {
      fn = arg5;
      goal = arg4;
    } else {
      throw new Error('SynthesisQueue: Missing synthesizer function');
    }

    const promise = new Promise<any>((resolve, reject) => {
      this.queue.push({
        key,
        fn,
        resolve,
        reject,
        goal,
      });
      this.notify();
    });

    this.inFlight.set(key, promise);
    this.notify();

    if (!this.processing) {
      this.processQueue();
    }

    return promise;
  }

  private async processQueue() {
    this.processing = true;
    this.notify();

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        const result = await item.fn();

        // Resolve this and any other matching queued requests that arrived
        const matchingIndex = this.queue.findIndex((r) => r.key === item.key);
        if (matchingIndex !== -1) {
          const matching = this.queue.splice(matchingIndex, 1)[0];
          matching.resolve(result);
        }

        item.resolve(result);
      } catch (e) {
        item.reject(e as Error);
      } finally {
        this.inFlight.delete(item.key);
        this.notify();
      }
    }

    this.processing = false;
    this.notify();
  }

  /**
   * Get queue statistics
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      inFlightRequests: this.inFlight.size,
      isProcessing: this.processing,
      deduplicatedCount: this.deduplicatedCount,
    };
  }
}

export const synthesisQueue = new SynthesisQueue();
