/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn()
  }
}));

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  return {
    Button: ({ children, ...props }: React.ComponentProps<typeof Pressable>) =>
      React.createElement(Pressable, props, children)
  };
});

jest.mock('@/components/ui/icon', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Icon: (props: React.ComponentProps<typeof View>) =>
      React.createElement(View, props)
  };
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Text: ({ children, ...props }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children)
  };
});

jest.mock('@/features/account/components/account-list', () => ({
  AccountList: () => null
}));

import { AccountHomeScreen } from '@/features/account/components/account-home-screen';

describe('AccountHomeScreen', () => {
  afterEach(async () => {
    await cleanup();
    jest.clearAllMocks();
  });

  it('opens settings from the header', async () => {
    const { getByLabelText } = await render(<AccountHomeScreen />);

    await fireEvent.press(getByLabelText('Open settings'));

    expect(router.push).toHaveBeenCalledWith('/settings');
  });
});
