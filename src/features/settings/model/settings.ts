export type ThemeMode = 'system' | 'light' | 'dark';

export type LockTimeoutSeconds = 0 | 60 | 300 | 900;

export interface AppSettings {
  lockTimeoutSeconds: LockTimeoutSeconds;
  requireBiometrics: boolean;
  themeMode: ThemeMode;
}

export const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export const LOCK_TIMEOUT_SECONDS: readonly LockTimeoutSeconds[] = [
  0, 60, 300, 900
];

export const DEFAULT_SETTINGS: AppSettings = {
  lockTimeoutSeconds: 60,
  requireBiometrics: false,
  themeMode: 'system'
};

export function parseAppSettings(value: unknown): AppSettings {
  if (!isRecord(value)) {
    throw new Error('Stored app settings must be an object.');
  }

  if (typeof value.requireBiometrics !== 'boolean') {
    throw new Error(
      'Stored app settings must include a boolean requireBiometrics flag.'
    );
  }

  const themeMode = isThemeMode(value.themeMode)
    ? value.themeMode
    : DEFAULT_SETTINGS.themeMode;
  const lockTimeoutSeconds = isLockTimeoutSeconds(value.lockTimeoutSeconds)
    ? value.lockTimeoutSeconds
    : DEFAULT_SETTINGS.lockTimeoutSeconds;

  return {
    lockTimeoutSeconds,
    requireBiometrics: value.requireBiometrics,
    themeMode
  };
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode);
}

export function isLockTimeoutSeconds(
  value: unknown
): value is LockTimeoutSeconds {
  return LOCK_TIMEOUT_SECONDS.includes(value as LockTimeoutSeconds);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}
