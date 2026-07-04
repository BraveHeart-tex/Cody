/* eslint-disable import/first */
import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { getDefaultAccountColor } from '@/features/totp/model/account-colors';
import type { TotpDraft } from '@/features/totp/model/parse-otpauth-uri';

jest.mock('@/features/totp/model/account-id', () => ({
  createAccountId: jest.fn()
}));

import { createAccountId } from '@/features/totp/model/account-id';
import {
  createManualOtpAccount,
  createScannedOtpAccount
} from '@/features/totp/model/create-account';

const mockCreateAccountId = jest.mocked(createAccountId);

describe('account creation helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockCreateAccountId.mockReset();
  });

  it('creates a manual TOTP account from validated values', () => {
    mockCreateAccountId.mockReturnValue('manual-account-id');
    jest.spyOn(Date, 'now').mockReturnValue(123456789);

    const account = createManualOtpAccount({
      issuer: 'GitHub',
      label: 'user@example.com',
      secret: 'JBSWY3DPEHPK3PXP',
      digits: 6,
      period: 30
    });

    expect(account).toEqual({
      id: 'manual-account-id',
      issuer: 'GitHub',
      label: 'user@example.com',
      secret: 'JBSWY3DPEHPK3PXP',
      type: 'totp',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      color: getDefaultAccountColor({
        id: 'manual-account-id',
        issuer: 'GitHub',
        label: 'user@example.com'
      }),
      createdAt: 123456789,
      sortOrder: 0
    });
  });

  it('creates a scanned TOTP account from a draft and trimmed label', () => {
    const draft: TotpDraft = {
      issuer: 'GitHub',
      label: 'user@example.com',
      secret: 'JBSWY3DPEHPK3PXP',
      type: 'totp',
      algorithm: 'SHA1',
      digits: 6,
      period: 30
    };

    mockCreateAccountId.mockReturnValue('scanned-account-id');
    jest.spyOn(Date, 'now').mockReturnValue(123456789);

    const account = createScannedOtpAccount(draft, ' edited@example.com ');

    expect(account).toEqual({
      ...draft,
      id: 'scanned-account-id',
      label: 'edited@example.com',
      color: getDefaultAccountColor({
        id: 'scanned-account-id',
        issuer: 'GitHub',
        label: 'edited@example.com'
      }),
      createdAt: 123456789,
      sortOrder: 0
    });
  });
});
