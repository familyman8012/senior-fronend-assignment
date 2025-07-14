interface QueueItem<T = any> {
  id: string;
  timestamp: number;
  data: T;
  retryCount: number;
  maxRetries: number;
}

export class OfflineQueue<T = any> {
  private queue: QueueItem<T>[] = [];
  private storageKey: string;
  private processing = false;
  private processCallback?: (item: T) => Promise<void>;
  private onError?: (error: Error, item: QueueItem<T>) => void;

  constructor(storageKey: string) {
    this.storageKey = storageKey;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load offline queue from storage:', error);
      this.queue = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue to storage:', error);
    }
  }

  add(data: T, maxRetries = 3): string {
    const id = `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const item: QueueItem<T> = {
      id,
      timestamp: Date.now(),
      data,
      retryCount: 0,
      maxRetries,
    };

    this.queue.push(item);
    this.saveToStorage();
    
    // Attempt to process immediately if online
    if (navigator.onLine && this.processCallback) {
      this.processQueue();
    }

    return id;
  }

  remove(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  clear(): void {
    this.queue = [];
    this.saveToStorage();
  }

  getItems(): QueueItem<T>[] {
    return [...this.queue];
  }

  setProcessor(callback: (item: T) => Promise<void>): void {
    this.processCallback = callback;
  }

  setErrorHandler(handler: (error: Error, item: QueueItem<T>) => void): void {
    this.onError = handler;
  }

  async processQueue(): Promise<void> {
    if (this.processing || !this.processCallback || !navigator.onLine) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        if (!navigator.onLine) {
          break;
        }

        const item = this.queue[0];

        try {
          await this.processCallback(item.data);
          // Successfully processed, remove from queue
          this.queue.shift();
          this.saveToStorage();
        } catch (error) {
          item.retryCount++;

          if (item.retryCount >= item.maxRetries) {
            // Max retries reached, remove from queue and call error handler
            this.queue.shift();
            this.saveToStorage();
            
            if (this.onError) {
              this.onError(error as Error, item);
            }
          } else {
            // Move to end of queue for retry
            this.queue.shift();
            this.queue.push(item);
            this.saveToStorage();
            
            // Wait before processing next item
            await new Promise(resolve => setTimeout(resolve, 1000 * item.retryCount));
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  startAutoProcess(): void {
    // Process queue when coming online
    window.addEventListener('online', () => {
      if (this.processCallback) {
        this.processQueue();
      }
    });

    // Attempt to process queue periodically
    setInterval(() => {
      if (navigator.onLine && this.processCallback && this.queue.length > 0) {
        this.processQueue();
      }
    }, 30000); // Every 30 seconds
  }
}