import pLimit from 'p-limit';

/**
 * Upload Queue Manager
 * Manages concurrent uploads with a maximum limit to prevent overwhelming the backend
 * and exhausting database connection pools
 */

export interface UploadTask<T> {
  id: string;
  execute: () => Promise<T>;
  onProgress?: (progress: number) => void;
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

export interface UploadQueueOptions {
  maxConcurrent?: number;
  onQueueStatusChange?: (status: QueueStatus) => void;
}

export interface QueueStatus {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  pending: number;
}

class UploadQueue {
  private limit: ReturnType<typeof pLimit>;
  private tasks: Map<string, UploadTask<any>> = new Map();
  private completed: Set<string> = new Set();
  private failed: Set<string> = new Set();
  private inProgress: Set<string> = new Set();
  private maxConcurrent: number;
  private onQueueStatusChange?: (status: QueueStatus) => void;

  constructor(options: UploadQueueOptions = {}) {
    this.maxConcurrent = options.maxConcurrent || 5;
    this.limit = pLimit(this.maxConcurrent);
    this.onQueueStatusChange = options.onQueueStatusChange;
  }

  /**
   * Add a task to the upload queue
   */
  addTask<T>(task: UploadTask<T>): Promise<T> {
    this.tasks.set(task.id, task);
    this.notifyStatusChange();

    return this.limit(async () => {
      this.inProgress.add(task.id);
      this.notifyStatusChange();

      try {
        console.log(`[Upload Queue] Starting upload: ${task.id}`);
        const result = await task.execute();
        
        this.completed.add(task.id);
        this.inProgress.delete(task.id);
        this.notifyStatusChange();

        if (task.onSuccess) {
          task.onSuccess(result);
        }

        console.log(`[Upload Queue] Completed upload: ${task.id}`);
        return result;
      } catch (error) {
        this.failed.add(task.id);
        this.inProgress.delete(task.id);
        this.notifyStatusChange();

        const err = error instanceof Error ? error : new Error(String(error));
        if (task.onError) {
          task.onError(err);
        }

        console.error(`[Upload Queue] Failed upload: ${task.id}`, err);
        throw err;
      }
    });
  }

  /**
   * Add multiple tasks to the queue
   */
  addTasks<T>(tasks: UploadTask<T>[]): Promise<T[]> {
    return Promise.all(tasks.map(task => this.addTask(task)));
  }

  /**
   * Get current queue status
   */
  getStatus(): QueueStatus {
    return {
      total: this.tasks.size,
      completed: this.completed.size,
      failed: this.failed.size,
      inProgress: this.inProgress.size,
      pending: this.tasks.size - this.completed.size - this.failed.size - this.inProgress.size,
    };
  }

  /**
   * Wait for all tasks to complete
   */
  async waitAll(): Promise<void> {
    await this.limit.clearQueue();
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    this.tasks.clear();
    this.completed.clear();
    this.failed.clear();
    this.inProgress.clear();
    this.notifyStatusChange();
  }

  /**
   * Reset the queue for new batch
   */
  reset(): void {
    this.clear();
  }

  /**
   * Notify listeners of status change
   */
  private notifyStatusChange(): void {
    if (this.onQueueStatusChange) {
      this.onQueueStatusChange(this.getStatus());
    }
  }

  /**
   * Get max concurrent uploads
   */
  getMaxConcurrent(): number {
    return this.maxConcurrent;
  }

  /**
   * Set max concurrent uploads
   */
  setMaxConcurrent(max: number): void {
    this.maxConcurrent = Math.max(1, max);
    this.limit = pLimit(this.maxConcurrent);
  }
}

/**
 * Create a new upload queue instance
 */
export function createUploadQueue(options?: UploadQueueOptions): UploadQueue {
  return new UploadQueue(options);
}

/**
 * Global upload queue instance (singleton)
 */
let globalQueue: UploadQueue | null = null;

export function getGlobalUploadQueue(options?: UploadQueueOptions): UploadQueue {
  if (!globalQueue) {
    globalQueue = new UploadQueue(options);
  }
  return globalQueue;
}
