/* eslint-disable import/first */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, render } from '@testing-library/react-native';
import { Appearance } from 'react-native';

import type { ThemeMode } from '@/features/settings/model/settings';

let mockThemeMode: ThemeMode = 'system';

jest.mock('@/features/settings/store/settings-store', () => ({
  useSettingsStore: (
    selector: (state: { settings: { themeMode: ThemeMode } }) => unknown
  ) =>
    selector({
      settings: {
        themeMode: mockThemeMode
      }
    })
}));

import { useThemeMode } from '@/features/settings/hooks/use-theme-mode';

const mockSetColorScheme = jest.spyOn(Appearance, 'setColorScheme');

function ThemeModeProbe({ enabled = true }: { enabled?: boolean }) {
  useThemeMode(enabled);

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

  it('waits until ready and does not reapply on unrelated renders', async () => {
    const view = await render(<ThemeModeProbe enabled={false} />);

    expect(mockSetColorScheme).not.toHaveBeenCalled();

    await view.rerender(<ThemeModeProbe />);
    await view.rerender(<ThemeModeProbe />);
    expect(mockSetColorScheme).toHaveBeenCalledTimes(1);

    mockThemeMode = 'dark';
    await view.rerender(<ThemeModeProbe />);
    expect(mockSetColorScheme).toHaveBeenLastCalledWith('dark');

    mockThemeMode = 'system';
    await view.rerender(<ThemeModeProbe />);
    expect(mockSetColorScheme).toHaveBeenLastCalledWith('unspecified');
  });

  it('applies explicit theme overrides', async () => {
    mockThemeMode = 'dark';

    await render(<ThemeModeProbe />);

    expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
  });
});
