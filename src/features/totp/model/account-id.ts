import { randomUUID } from 'expo-crypto';

export function createAccountId(): string {
  return randomUUID();
}
