import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retry, debounce, throttle } from '@/utils/retry';

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    
    const result = await retry(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');
    
    const promise = retry(fn, {
      maxAttempts: 3,
      initialDelay: 100,
    });

    // Fast-forward through retries
    await vi.runAllTimersAsync();
    
    const result = await promise;
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should fail after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const promise = retry(fn, {
      maxAttempts: 2,
      initialDelay: 100,
    });

    await vi.runAllTimersAsync();
    
    await expect(promise).rejects.toThrow('Network error');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry if shouldRetry returns false', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Permanent error'));
    
    await expect(
      retry(fn, {
        shouldRetry: () => false,
      })
    ).rejects.toThrow('Permanent error');
    
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use exponential backoff', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');
    
    const onRetry = vi.fn();
    
    const promise = retry(fn, {
      maxAttempts: 3,
      initialDelay: 100,
      backoffFactor: 2,
      onRetry,
    });

    // First retry after ~100ms (plus jitter)
    await vi.advanceTimersByTimeAsync(150);
    expect(onRetry).toHaveBeenCalledTimes(1);
    
    // Second retry after ~200ms (plus jitter)
    await vi.advanceTimersByTimeAsync(250);
    expect(onRetry).toHaveBeenCalledTimes(2);
    
    await promise;
  });

  it('should respect maxDelay', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const promise = retry(fn, {
      maxAttempts: 5,
      initialDelay: 1000,
      maxDelay: 2000,
      backoffFactor: 10,
    });

    await vi.runAllTimersAsync();
    
    await expect(promise).rejects.toThrow();
    
    // Even with high backoff factor, delays should be capped at maxDelay
    expect(fn).toHaveBeenCalledTimes(5);
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce function calls', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    
    debounced('first');
    debounced('second');
    debounced('third');
    
    expect(fn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(100);
    
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('third');
  });

  it('should reset timer on each call', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    
    debounced('first');
    vi.advanceTimersByTime(50);
    
    debounced('second');
    vi.advanceTimersByTime(50);
    
    expect(fn).not.toHaveBeenCalled();
    
    vi.advanceTimersByTime(50);
    
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');
  });
});

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should throttle function calls', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('first');
    throttled('second');
    throttled('third');
    
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('first');
    
    vi.advanceTimersByTime(100);
    
    throttled('fourth');
    
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenCalledWith('fourth');
  });

  it('should allow calls after throttle period', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    
    throttled('first');
    expect(fn).toHaveBeenCalledTimes(1);
    
    vi.advanceTimersByTime(50);
    throttled('second'); // Should be ignored
    expect(fn).toHaveBeenCalledTimes(1);
    
    vi.advanceTimersByTime(50);
    throttled('third'); // Should be allowed
    expect(fn).toHaveBeenCalledTimes(2);
  });
});