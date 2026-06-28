import { act, cleanup, renderHook } from '@testing-library/react-native';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';

import {
  useTotpCountdown,
  type TotpPeriod
} from '@/features/totp/hooks/use-totp-countdown';

const SECOND_MS = 1000;
const BASE_TIMESTAMP = new Date('2026-01-01T00:00:00.000Z').getTime();

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useTotpCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('returns the initial 30-second period state at an exact boundary', async () => {
    const { result } = await renderCountdown(30, BASE_TIMESTAMP);

    expect(result.current).toEqual({
      remainingSeconds: 30,
      progress: 0,
      periodStartedAt: BASE_TIMESTAMP,
      periodEndsAt: BASE_TIMESTAMP + 30 * SECOND_MS
    });
  });

  it('resets remaining seconds at the next 30-second boundary', async () => {
    const { result } = await renderCountdown(
      30,
      BASE_TIMESTAMP + 29 * SECOND_MS
    );

    expect(result.current.remainingSeconds).toBe(1);
    expect(result.current.periodStartedAt).toBe(BASE_TIMESTAMP);

    await act(async () => {
      jest.advanceTimersByTime(SECOND_MS);
    });

    expect(result.current.remainingSeconds).toBe(30);
    expect(result.current.progress).toBe(0);
    expect(result.current.periodStartedAt).toBe(
      BASE_TIMESTAMP + 30 * SECOND_MS
    );
    expect(result.current.periodEndsAt).toBe(BASE_TIMESTAMP + 60 * SECOND_MS);
  });

  it('supports 60-second periods', async () => {
    const { result } = await renderCountdown(
      60,
      BASE_TIMESTAMP + 45 * SECOND_MS
    );

    expect(result.current.remainingSeconds).toBe(15);
    expect(result.current.progress).toBe(0.75);
    expect(result.current.periodStartedAt).toBe(BASE_TIMESTAMP);
    expect(result.current.periodEndsAt).toBe(BASE_TIMESTAMP + 60 * SECOND_MS);
  });

  it('exposes elapsed progress from 0 to near 1', async () => {
    const { result } = await renderCountdown(30, BASE_TIMESTAMP);

    expect(result.current.progress).toBe(0);

    await act(async () => {
      jest.advanceTimersByTime(15 * SECOND_MS);
    });

    expect(result.current.progress).toBe(0.5);

    await act(async () => {
      jest.advanceTimersByTime(14 * SECOND_MS);
    });

    expect(result.current.progress).toBeCloseTo(29 / 30);
  });

  it('cleans up pending timers on unmount', async () => {
    const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    const { unmount } = await renderCountdown(30, BASE_TIMESTAMP);

    await act(async () => {
      jest.advanceTimersByTime(SECOND_MS);
    });

    await unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  function renderCountdown(period: TotpPeriod, timestamp: number) {
    jest.setSystemTime(timestamp);

    return renderHook(() => useTotpCountdown(period));
  }
});
