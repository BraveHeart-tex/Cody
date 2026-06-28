import { useEffect, useState } from 'react';

export interface TotpCountdownState {
  remainingSeconds: number;
  progress: number;
  periodStartedAt: number;
  periodEndsAt: number;
}

export type TotpPeriod = 30 | 60;

const SECOND_MS = 1000;

export function useTotpCountdown(period: TotpPeriod): TotpCountdownState {
  const [state, setState] = useState(() =>
    getTotpCountdownState(Date.now(), period)
  );

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const tick = () => {
      setState(getTotpCountdownState(Date.now(), period));
    };

    tick();

    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, SECOND_MS);
    }, getMillisecondsUntilNextSecond(Date.now()));

    return () => {
      clearTimeout(timeoutId);

      if (intervalId != null) {
        clearInterval(intervalId);
      }
    };
  }, [period]);

  return state;
}

function getTotpCountdownState(
  timestamp: number,
  period: TotpPeriod
): TotpCountdownState {
  const periodMilliseconds = period * SECOND_MS;
  const periodStartedAt =
    Math.floor(timestamp / periodMilliseconds) * periodMilliseconds;
  const periodEndsAt = periodStartedAt + periodMilliseconds;
  const elapsedMilliseconds = timestamp - periodStartedAt;
  const remainingSeconds = period - Math.floor(elapsedMilliseconds / SECOND_MS);
  const progress = clamp(elapsedMilliseconds / periodMilliseconds, 0, 1);

  return {
    remainingSeconds,
    progress,
    periodStartedAt,
    periodEndsAt
  };
}

function getMillisecondsUntilNextSecond(timestamp: number): number {
  const elapsedMilliseconds = timestamp % SECOND_MS;

  return elapsedMilliseconds === 0
    ? SECOND_MS
    : SECOND_MS - elapsedMilliseconds;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
