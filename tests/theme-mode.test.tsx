/* eslint-disable import/first */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, render } from '@testing-library/react-native';
import { Appearance } from 'react-native';

import type { ThemeMode } from '@/features/settings/model/settings';

let mockThemeMode: ThemeMode = 'system';

jest.mock('@/features/settings/hooks/use-settings', () => ({
  useSettings: () => ({
    settings: {
      lockTimeoutSeconds: 60,
      requireBiometrics: false,
      themeMode: mockThemeMode
    }
  })
}));

import { useThemeMode } from '@/features/settings/hooks/use-theme-mode';

const mockSetColorScheme = jest.spyOn(Appearance, 'setColorScheme');

function ThemeModeProbe() {
  useThemeMode();

  return null;
}

describe('useThemeMode', () => {
  afterEach(async () => {
    await cleanup();
    mockThemeMode = 'system';
    mockSetColorScheme.mockClear();
  });

  it('clears overrides for system mode', async () => {
    await render(<ThemeModeProbe />);

    expect(mockSetColorScheme).toHaveBeenCalledWith('unspecified');
  });

  it('applies explicit theme overrides', async () => {
    mockThemeMode = 'dark';

    await render(<ThemeModeProbe />);

    expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
  });
});
