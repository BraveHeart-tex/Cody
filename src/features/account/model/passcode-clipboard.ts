import * as Clipboard from 'expo-clipboard';

export async function copyPasscode(passcode: string): Promise<void> {
  await Clipboard.setStringAsync(passcode);
}
