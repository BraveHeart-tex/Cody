import { describe, expect, it } from '@jest/globals';

import { parseOtpAuthUri } from '@/features/totp/model/parse-otpauth-uri';
import { generateTotpCode } from '@/features/totp/model/totp-code';

const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('scanned secret validation', () => {
  it.each(['ABC', 'BADSECRET', 'JBSWY3DPEHPK3PXP'])(
    'rejects unusable Base32 secret %s',
    secret => {
      expect(
        parseOtpAuthUri(`otpauth://totp/Test:user?secret=${secret}`)
      ).toEqual({
        ok: false,
        error: 'Scan a QR code with a valid authenticator secret.'
      });
    }
  );

  it.each(['SHA1', 'SHA256', 'SHA512'])(
    'accepts a usable secret with %s',
    algorithm => {
      const result = parseOtpAuthUri(
        `otpauth://totp/Test:user?secret=${SECRET.toLowerCase()}&algorithm=${algorithm}&digits=8&period=60`
      );

      expect(result.ok).toBe(true);

      if (!result.ok) {
        throw new Error(result.error);
      }

      expect(result.account).toMatchObject({
        secret: SECRET,
        algorithm,
        digits: 8,
        period: 60
      });
      expect(
        generateTotpCode({ ...result.account, period: 60, timestamp: 0 })
      ).toMatch(/^\d{8}$/);
    }
  );
});
