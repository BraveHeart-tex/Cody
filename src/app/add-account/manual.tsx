import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatusMessage } from '@/components/ui/status-message';
import { Text } from '@/components/ui/text';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import { createAccountId } from '@/features/totp/model/account-id';
import { getDefaultAccountColor } from '@/features/totp/model/account-colors';
import {
  validateManualAccount,
  type ManualTotpDigits,
  type ManualTotpPeriod
} from '@/features/totp/model/manual-account';
import type { OtpAccount } from '@/features/totp/model/totp-account';

const PERIOD_OPTIONS: ManualTotpPeriod[] = [30, 60];
const DIGIT_OPTIONS: ManualTotpDigits[] = [6, 8];

export default function ManualAddAccountScreen() {
  const { accounts, addAccount, error, isLoading } = useAccounts();
  const [issuer, setIssuer] = useState('');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [period, setPeriod] = useState<ManualTotpPeriod>(30);
  const [digits, setDigits] = useState<ManualTotpDigits>(6);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const validation = useMemo(
    () =>
      validateManualAccount(
        {
          issuer,
          label,
          secret,
          period,
          digits
        },
        accounts
      ),
    [accounts, digits, issuer, label, period, secret]
  );

  const storageError = error == null ? null : 'Account storage is unavailable.';
  const validationError =
    hasSubmitted || label.length > 0 || secret.length > 0
      ? validation.error
      : null;
  const statusMessage = saveError ?? storageError ?? validationError;
  const isSubmitDisabled =
    isLoading || isSaving || storageError != null || !validation.isValid;

  const handleSubmit = useCallback(async () => {
    setHasSubmitted(true);
    setSaveError(null);

    if (isSubmitDisabled) {
      return;
    }

    const accountId = createAccountId();
    const account: OtpAccount = {
      id: accountId,
      issuer: validation.issuer,
      label: validation.label,
      secret: validation.secret,
      type: 'totp',
      algorithm: 'SHA1',
      digits,
      period,
      color: getDefaultAccountColor({
        id: accountId,
        issuer: validation.issuer,
        label: validation.label
      }),
      createdAt: Date.now(),
      sortOrder: 0
    };

    try {
      setIsSaving(true);
      await addAccount(account);
      router.replace('/');
    } catch {
      setSaveError('Could not save this account. Try again.');
    } finally {
      setIsSaving(false);
    }
  }, [addAccount, digits, isSubmitDisabled, period, validation]);

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-6 px-6 pb-safe"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="pt-6">
        <Text className="text-muted-foreground text-base leading-6">
          Add an authenticator account with the manual setup details.
        </Text>
      </View>

      <View className="gap-5">
        <Field label="Issuer">
          <Input
            accessibilityLabel="Issuer"
            autoCapitalize="words"
            autoCorrect={false}
            onChangeText={setIssuer}
            placeholder="GitHub"
            value={issuer}
          />
        </Field>

        <Field label="Account label" required>
          <Input
            accessibilityLabel="Account label"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setLabel}
            placeholder="user@example.com"
            value={label}
          />
        </Field>

        <Field label="Secret key" required>
          <View className="gap-2">
            <View className="flex-row gap-2">
              <Input
                accessibilityLabel="Secret key"
                autoCapitalize="characters"
                autoCorrect={false}
                className="flex-1"
                onChangeText={setSecret}
                placeholder="JBSW Y3DP EHPK 3PXP"
                secureTextEntry={!isSecretVisible}
                value={secret}
              />
              <Button
                accessibilityLabel={
                  isSecretVisible ? 'Hide secret key' : 'Reveal secret key'
                }
                className="min-w-20"
                size="sm"
                variant="outline"
                onPress={() => setIsSecretVisible(current => !current)}
              >
                <Text>{isSecretVisible ? 'Hide' : 'Show'}</Text>
              </Button>
            </View>
          </View>
        </Field>

        <Field label="Period">
          <SegmentedControl
            options={PERIOD_OPTIONS}
            selectedValue={period}
            suffix=" sec"
            onSelect={setPeriod}
          />
        </Field>

        <Field label="Digits">
          <SegmentedControl
            options={DIGIT_OPTIONS}
            selectedValue={digits}
            onSelect={setDigits}
          />
        </Field>
      </View>

      {statusMessage != null ? <StatusMessage value={statusMessage} /> : null}

      <Button disabled={isSubmitDisabled} onPress={handleSubmit}>
        <Text>
          {isSaving ? 'Saving...' : isLoading ? 'Loading...' : 'Save Account'}
        </Text>
      </Button>
    </ScrollView>
  );
}
