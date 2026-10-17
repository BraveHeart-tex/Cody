export function normalizeAccountSecret(secret: string): string {
  return secret.replace(/\s+/g, '').toUpperCase().replace(/=+$/, '');
}
