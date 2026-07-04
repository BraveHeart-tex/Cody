/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: React.ComponentProps<typeof View>) =>
        React.createElement(View, props, children)
    },
    Easing: {
      cubic: (value: number) => value,
      in: (easing: (value: number) => number) => easing,
      linear: (value: number) => value,
      out: (easing: (value: number) => number) => easing
    },
    useAnimatedStyle: (styleFactory: () => object) => styleFactory(),
    useSharedValue: (value: number) => ({ value }),
    withSequence: (...values: number[]) => values[values.length - 1],
    withTiming: (value: number) => value
  };
});

import { AccountCountdownProgress } from '@/features/account/components/account-countdown-progress';

const baseProps = {
  color: '#0891B2',
  period: 30,
  periodStartedAt: 1000,
  periodEndsAt: 31000,
  remainingSeconds: 18
};

describe('AccountCountdownProgress', () => {
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('renders the progressbar with correct accessibility values on mount', async () => {
    const { getByTestId, getByLabelText } = await render(
      <AccountCountdownProgress {...baseProps} />
    );

    const progress = getByTestId('account-card-progress');

    expect(progress).toBeTruthy();
    expect(progress.props.accessibilityValue).toEqual({
      max: 30,
      min: 0,
      now: 18
    });
    expect(getByLabelText('18s until refresh')).toBeTruthy();
  });

  it('does not throw when re-rendered mid-period with the same period bounds', async () => {
    const { rerender, getByTestId } = await render(
      <AccountCountdownProgress {...baseProps} />
    );

    await rerender(
      <AccountCountdownProgress {...baseProps} remainingSeconds={12} />
    );

    expect(getByTestId('account-card-progress')).toBeTruthy();
  });

  it('does not throw when the period resets to a new window', async () => {
    const { rerender, getByTestId, getByLabelText } = await render(
      <AccountCountdownProgress {...baseProps} />
    );

    // Simulate a real TOTP period rollover: new start/end bounds.
    await rerender(
      <AccountCountdownProgress
        {...baseProps}
        periodStartedAt={31000}
        periodEndsAt={61000}
        remainingSeconds={30}
      />
    );

    expect(getByTestId('account-card-progress')).toBeTruthy();
    expect(getByLabelText('30s until refresh')).toBeTruthy();
  });

  it('updates accessibility value when remainingSeconds changes', async () => {
    const { rerender, getByTestId } = await render(
      <AccountCountdownProgress {...baseProps} />
    );

    await rerender(
      <AccountCountdownProgress {...baseProps} remainingSeconds={5} />
    );

    expect(
      getByTestId('account-card-progress').props.accessibilityValue
    ).toEqual({
      max: 30,
      min: 0,
      now: 5
    });
  });
});
