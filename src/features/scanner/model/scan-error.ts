export interface ScanError {
  title: string;
  description: string;
}

export function getScanError(value: string, diagnostic?: string): ScanError {
  if (diagnostic?.startsWith('Unsupported')) {
    return {
      title: 'Unsupported authenticator setup',
      description:
        'Use a time-based setup with SHA-1, SHA-256 or SHA-512, 6 to 8 digits, and a 30 or 60 second interval.'
    };
  }

  if (!value.trim().toLowerCase().startsWith('otpauth:')) {
    return {
      title: 'This is not an authenticator QR code',
      description:
        'Open the two-factor setup screen on the account you want to add.'
    };
  }

  return {
    title: 'Scan a valid authenticator QR code',
    description:
      'This code has missing or invalid account details. Get a new setup QR code from your account provider.'
  };
}
