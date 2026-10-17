import { describe, expect, it } from '@jest/globals';

import {
  normalizeManualSecret,
  validateManualAccount
} from '@/features/totp/model/manual-account';

const VALID_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('manual account validation', () => {
  it('normalizes whitespace and casing from manual secrets', () => {
    expect(
      normalizeManualSecret(' gezd gnbv gy3t qojq gezd gnbv gy3t qojq ')
    ).toBe(VALID_SECRET);
  });

  it('normalizes optional Base32 padding', () => {
    expect(normalizeManualSecret(' my====== ')).toBe('MY');
  });

  it('accepts a valid manual TOTP account', () => {
    const result = validateManualAccount(
      {
        issuer: ' GitHub ',
        label: ' user@example.com ',
        secret: ' gezd gnbv gy3t qojq gezd gnbv gy3t qojq ',
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
      error: 'Enter a valid authenticator secret.',
      isValid: false
    });
  });

  it('blocks duplicate normalized secrets', () => {
    expect(
      validateManualAccount(
        {
          issuer: 'GitHub',
          label: 'user@example.com',
          secret: 'gezd gnbv gy3t qojq gezd gnbv gy3t qojq',
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
