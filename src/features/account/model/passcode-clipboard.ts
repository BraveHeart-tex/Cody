import { setStringAsync } from 'expo-clipboard';

export async function copyPasscode(passcode: string): Promise<void> {
  await setStringAsync(passcode);
}
