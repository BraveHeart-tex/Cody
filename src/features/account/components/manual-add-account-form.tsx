import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatusMessage } from '@/components/ui/status-message';
import { Text } from '@/components/ui/text';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import { createManualOtpAccount } from '@/features/totp/model/create-account';
import { DuplicateAccountSecretError } from '@/features/totp/model/account-errors';
import {
  getManualAccountSecretSet,
  validateManualAccountBasics,
  validateManualAccountWithTotp,
  type ManualTotpDigits,
  type ManualTotpPeriod
} from '@/features/totp/model/manual-account';

const PERIOD_OPTIONS: ManualTotpPeriod[] = [30, 60];
const DIGIT_OPTIONS: ManualTotpDigits[] = [6, 8];

interface ManualAddAccountFormProps {
  onSaved: () => void;
}

export function ManualAddAccountForm({ onSaved }: ManualAddAccountFormProps) {
  const { accounts, addAccount, error, isLoading, retryLoad } = useAccounts();
  const [issuer, setIssuer] = useState('');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [period, setPeriod] = useState<ManualTotpPeriod>(30);
  const [digits, setDigits] = useState<ManualTotpDigits>(6);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [totpValidation, setTotpValidation] = useState<{
    key: string;
    error: string | null;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const pendingSave = useRef<{
    key: string;
    account: ReturnType<typeof createManualOtpAccount>;
  } | null>(null);

  const existingSecrets = useMemo(
    () => getManualAccountSecretSet(accounts),
    [accounts]
  );
  const validation = useMemo(
    () =>
      validateManualAccountBasics(
        {
          issuer,
          label,
          secret,
          period,
          digits
        },
        existingSecrets
      ),
    [digits, existingSecrets, issuer, label, period, secret]
  );
  const totpValidationKey = JSON.stringify({
    secret: validation.secret,
    digits,
    period
  });
  const totpValidationError =
    totpValidation?.key === totpValidationKey ? totpValidation.error : null;

  const storageError =
    error == null
      ? null
      : 'Cody could not read the saved accounts. Retry to try again.';
  const validationError =
    hasSubmitted || label.length > 0 || secret.length > 0
      ? (validation.error ?? totpValidationError)
      : null;
  const statusMessage = saveError ?? storageError ?? validationError;
  const isSubmitDisabled =
    isLoading ||
    isSaving ||
    storageError != null ||
    !validation.isValid ||
    totpValidationError != null;

  const handleRetry = useCallback(async () => {
    if (isRetrying) {
      return;
    }

    setSaveError(null);
    setIsRetrying(true);

    try {
      await retryLoad();
    } catch {
      // The storage error from useAccounts remains visible for another retry.
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, retryLoad]);

  const handleSecretBlur = useCallback(() => {
    if (!validation.isValid) {
      return;
    }

    const checked = validateManualAccountWithTotp(
      { issuer, label, secret, period, digits },
      existingSecrets
    );

    setTotpValidation({
      key: totpValidationKey,
      error: checked.error
    });
  }, [
    digits,
    existingSecrets,
    issuer,
    label,
    period,
    secret,
    totpValidationKey,
    validation.isValid
  ]);

  const handleSubmit = useCallback(async () => {
    setHasSubmitted(true);
    setSaveError(null);

    if (isSubmitDisabled) {
      return;
    }

    const submitValidation = validateManualAccountWithTotp(
      { issuer, label, secret, period, digits },
      existingSecrets
    );

    if (!submitValidation.isValid) {
      setTotpValidation({
        key: totpValidationKey,
        error: submitValidation.error
      });

      return;
    }

    const inputKey = JSON.stringify({
      issuer: submitValidation.issuer,
      label: submitValidation.label,
      secret: submitValidation.secret,
      digits,
      period
    });
    const account =
      pendingSave.current?.key === inputKey
        ? pendingSave.current.account
        : createManualOtpAccount({
            issuer: submitValidation.issuer,
            label: submitValidation.label,
            secret: submitValidation.secret,
            digits,
            period
          });

    pendingSave.current = { key: inputKey, account };

    try {
      setIsSaving(true);
      await addAccount(account);
      pendingSave.current = null;
      onSaved();
    } catch (cause) {
      setSaveError(
        cause instanceof DuplicateAccountSecretError
          ? 'This account is already saved.'
          : 'Could not save this account. Try again.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    addAccount,
    digits,
    existingSecrets,
    isSubmitDisabled,
    issuer,
    label,
    onSaved,
    period,
    secret,
    totpValidationKey
  ]);

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-6 px-6 pb-safe"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-muted-foreground text-base leading-6">
        Add an authenticator account with the manual setup details.
      </Text>

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
            <View className="flex-row items-center gap-2">
              <Input
                accessibilityLabel="Secret key"
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
                importantForAutofill="no"
                keyboardType="default"
                onChangeText={value => {
                  setSecret(value.toUpperCase());
                  setTotpValidation(null);
                }}
                onBlur={handleSecretBlur}
                placeholder="JBSW Y3DP EHPK 3PXP"
                secureTextEntry={!isSecretVisible}
                textContentType="none"
                value={secret}
                className="flex-1"
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
            onSelect={value => {
              setPeriod(value);
              setTotpValidation(null);
            }}
          />
        </Field>

        <Field label="Digits">
          <SegmentedControl
            options={DIGIT_OPTIONS}
            selectedValue={digits}
            onSelect={value => {
              setDigits(value);
              setTotpValidation(null);
            }}
          />
        </Field>
      </View>

      {statusMessage != null ? <StatusMessage value={statusMessage} /> : null}

      {storageError != null || isRetrying ? (
        <Button
          accessibilityLabel="Retry loading saved accounts"
          disabled={isRetrying || isLoading}
          onPress={() => void handleRetry()}
          variant="outline"
        >
          <Text>{isRetrying || isLoading ? 'Retrying...' : 'Retry'}</Text>
        </Button>
      ) : null}

      <Button disabled={isSubmitDisabled} onPress={handleSubmit}>
        <Text>
          {isSaving ? 'Saving...' : isLoading ? 'Loading...' : 'Save Account'}
        </Text>
      </Button>
    </ScrollView>
  );
}
