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
    return DEFAULT_SETTINGS;
  }

  const themeMode = isThemeMode(value.themeMode)
    ? value.themeMode
    : DEFAULT_SETTINGS.themeMode;
  const requireBiometrics =
    typeof value.requireBiometrics === 'boolean'
      ? value.requireBiometrics
      : DEFAULT_SETTINGS.requireBiometrics;
  const lockTimeoutSeconds = isLockTimeoutSeconds(value.lockTimeoutSeconds)
    ? value.lockTimeoutSeconds
    : DEFAULT_SETTINGS.lockTimeoutSeconds;

  return {
    lockTimeoutSeconds,
    requireBiometrics,
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
  return typeof value === 'object' && value != null;
}
