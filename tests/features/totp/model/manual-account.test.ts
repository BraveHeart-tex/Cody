/* eslint-disable import/first */
import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/features/totp/model/totp-code', () => ({
  generateTotpCode: ({ secret }: { secret: string }) =>
    secret === 'BADSECRET' ? '' : '123456'
}));

import {
  normalizeManualSecret,
  validateManualAccount
} from '@/features/totp/model/manual-account';

const VALID_SECRET = 'JBSWY3DPEHPK3PXP';

describe('manual account validation', () => {
  it('normalizes whitespace and casing from manual secrets', () => {
    expect(normalizeManualSecret(' jbsw y3dp ehpk 3pxp ')).toBe(VALID_SECRET);
  });

  it('accepts a valid manual TOTP account', () => {
    const result = validateManualAccount(
      {
        issuer: ' GitHub ',
        label: ' user@example.com ',
        secret: ' jbsw y3dp ehpk 3pxp ',
        period: 30,
        digits: 6
      },
      []
    );

    expect(result).toEqual({
      issuer: 'GitHub',
      label: 'user@example.com',
      secret: VALID_SECRET,
      error: null,
      isValid: true
    });
  });

  it('requires an account label', () => {
    expect(
      validateManualAccount(
        {
          issuer: 'GitHub',
          label: ' ',
          secret: VALID_SECRET,
          period: 30,
          digits: 6
        },
        []
      )
    ).toMatchObject({
      error: 'Enter an account label.',
      isValid: false
    });
  });

  it('rejects invalid base32 secrets', () => {
    expect(
      validateManualAccount(
        {
          issuer: 'GitHub',
          label: 'user@example.com',
          secret: 'ABC123',
          period: 30,
          digits: 6
        },
        []
      )
    ).toMatchObject({
      error: 'Secret key must use base32 characters A-Z and 2-7.',
      isValid: false
    });
  });

  it('rejects secrets that cannot generate a code', () => {
    expect(
      validateManualAccount(
        {
          issuer: 'GitHub',
          label: 'user@example.com',
          secret: 'BADSECRET',
          period: 30,
          digits: 6
        },
        []
      )
    ).toMatchObject({
      error: 'Secret key is not valid.',
      isValid: false
    });
  });

  it('blocks duplicate normalized secrets', () => {
    expect(
      validateManualAccount(
        {
          issuer: 'GitHub',
          label: 'user@example.com',
          secret: 'jbsw y3dp ehpk 3pxp',
          period: 60,
          digits: 8
        },
        [{ secret: VALID_SECRET.toLowerCase() }]
      )
    ).toMatchObject({
      error: 'This account is already saved.',
      isValid: false
    });
  });
});
