import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitForCondition, waitForTrue } from '../helpers';

describe('waitForCondition', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve when condition returns truthy value', async () => {
    let counter = 0;
    const conditionFn = vi.fn().mockImplementation(async () => {
      counter++;
      return counter >= 3;
    });

    // Use real timers for this test
    vi.useRealTimers();
    
    const result = waitForCondition(conditionFn, { timeout: 1000, interval: 10 });
    const value = await result;
    
    expect(value).toBe(true);
    expect(conditionFn).toHaveBeenCalledTimes(3);
  });

  it('should call onTimeout when provided and timeout occurs', async () => {
    vi.useRealTimers();
    
    const onTimeout = vi.fn();
    const conditionFn = vi.fn().mockImplementation(async () => false);
    
    const promise = waitForCondition(conditionFn, { 
      timeout: 50, 
      interval: 10,
      onTimeout 
    });
    
    // With onTimeout, it should NOT throw but call onTimeout and return last result
    const result = await promise;
    expect(onTimeout).toHaveBeenCalled();
    expect(result).toBe(false); // Returns last result
  });
});

describe('waitForTrue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should resolve when condition returns true', async () => {
    vi.useRealTimers();
    
    let ready = false;
    const conditionFn = vi.fn().mockImplementation(async () => ready);
    
    // Start waiting before ready
    const promise = waitForTrue(conditionFn, { timeout: 1000, interval: 10 });
    
    // Now set ready
    ready = true;
    
    const result = await promise;
    expect(result).toBe(true);
  });
});
