/* eslint-disable @typescript-eslint/no-require-imports */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest
} from '@jest/globals';
import { act, cleanup, fireEvent, render } from '@testing-library/react-native';
import { AppState, Linking, Platform } from 'react-native';

import { BiometricGuidance } from '@/features/settings/components/biometric-guidance';
import { getBiometricsSupportStatus } from '@/features/settings/model/biometrics';

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    TextClassContext: React.createContext(''),
    Text: ({ children, ...props }: React.ComponentProps<typeof Text>) =>
      React.createElement(Text, props, children)
  };
});

jest.mock('@/features/settings/model/biometrics', () => ({
  getBiometricsSupportStatus: jest.fn()
}));

const support = jest.mocked(getBiometricsSupportStatus);
const originalPlatform = Platform.OS;
let listener: (state: 'active' | 'background') => void;

describe('biometric setup guidance', () => {
  beforeEach(() => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android'
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_type, callback) => {
        listener = callback;

        return { remove: jest.fn() };
      });
    jest.spyOn(Linking, 'sendIntent').mockResolvedValue(undefined);
    jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    support.mockResolvedValue({ isSupported: true });
  });
  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform
    });
  });

  it('opens Android security settings and rechecks support on return without granting access', async () => {
    const onAvailable = jest.fn();
    const screen = await render(
      <BiometricGuidance onAvailable={onAvailable} />
    );

    await fireEvent.press(screen.getByText('See device settings steps'));
    await fireEvent.press(screen.getByText('Open security settings'));
    expect(Linking.sendIntent).toHaveBeenCalledWith(
      'android.settings.SECURITY_SETTINGS'
    );
    expect(onAvailable).not.toHaveBeenCalled();
    await act(async () => {
      listener('background');
      listener('active');
    });
    expect(support).toHaveBeenCalledTimes(1);
    expect(onAvailable).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(
        'Biometrics are ready. Try again to confirm your identity.'
      )
    ).toBeTruthy();
    await act(async () => {
      listener('active');
    });
    expect(support).toHaveBeenCalledTimes(1);
  });

  it('retains instructions if native settings cannot open', async () => {
    jest
      .mocked(Linking.sendIntent)
      .mockRejectedValueOnce(new Error('no handler'));
    const screen = await render(<BiometricGuidance />);

    await fireEvent.press(screen.getByText('See device settings steps'));
    await fireEvent.press(screen.getByText('Open security settings'));
    expect(screen.getByText(/Couldn’t open settings/)).toBeTruthy();
  });

  it('accurately labels the iOS app settings destination', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const screen = await render(<BiometricGuidance />);

    await fireEvent.press(screen.getByText('See device settings steps'));
    expect(screen.getByText(/Face ID & Passcode/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Open Cody settings'));
    expect(Linking.openSettings).toHaveBeenCalled();
    expect(Linking.sendIntent).not.toHaveBeenCalled();
  });
});
