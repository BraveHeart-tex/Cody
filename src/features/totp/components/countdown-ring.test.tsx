/* eslint-disable import/first */
import { createElement as mockCreateElement, type ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react-native';
import { afterEach, describe, expect, it, jest } from '@jest/globals';

interface MockTextProps {
  children?: ReactNode;
}

jest.mock('@/components/ui/text', () => ({
  Text: ({ children }: MockTextProps) =>
    mockCreateElement('Text', null, children)
}));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    createAnimatedComponent: (Component: unknown) => Component
  },
  Easing: {
    linear: (value: number) => value
  },
  useAnimatedProps: (propsFactory: () => object) => propsFactory(),
  useSharedValue: (value: number) => ({ value }),
  withTiming: (value: number) => value
}));

import {
  CountdownRing,
  getRemainingProgress
} from '@/features/totp/components/countdown-ring';

const SECOND_MS = 1000;
const BASE_TIMESTAMP = new Date('2026-01-01T00:00:00.000Z').getTime();

describe('CountdownRing', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('shows the remaining seconds in the center', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(BASE_TIMESTAMP);

    const { getByLabelText, getByText } = await render(
      <CountdownRing
        periodEndsAt={BASE_TIMESTAMP + 30 * SECOND_MS}
        periodStartedAt={BASE_TIMESTAMP}
        seconds={30}
      />
    );

    expect(getByLabelText('30 seconds remaining')).toBeTruthy();
    expect(getByText('30')).toBeTruthy();
  });

  it('calculates remaining progress for 30-second accounts', () => {
    expect(
      getRemainingProgress(
        BASE_TIMESTAMP + 15 * SECOND_MS,
        BASE_TIMESTAMP,
        BASE_TIMESTAMP + 30 * SECOND_MS
      )
    ).toBe(0.5);
  });

  it('calculates remaining progress for 60-second accounts', () => {
    expect(
      getRemainingProgress(
        BASE_TIMESTAMP + 45 * SECOND_MS,
        BASE_TIMESTAMP,
        BASE_TIMESTAMP + 60 * SECOND_MS
      )
    ).toBe(0.25);
  });

  it('resets remaining progress at a new period boundary', () => {
    expect(
      getRemainingProgress(
        BASE_TIMESTAMP + 30 * SECOND_MS,
        BASE_TIMESTAMP + 30 * SECOND_MS,
        BASE_TIMESTAMP + 60 * SECOND_MS
      )
    ).toBe(1);
  });
});
