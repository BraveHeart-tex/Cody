import { useCallback, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatusMessage } from '@/components/ui/status-message';
import { Skeleton } from '@/components/ui/skeleton';
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
  const headerHeight = useHeaderHeight();
  const { accounts, addAccount, error, isLoading, retryLoad } = useAccounts();
  const [issuer, setIssuer] = useState('');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [period, setPeriod] = useState<ManualTotpPeriod>(30);
  const [digits, setDigits] = useState<ManualTotpDigits>(6);
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [touched, setTouched] = useState({ label: false, secret: false });
  const [totpValidation, setTotpValidation] = useState<{
    key: string;
    error: string | null;
  } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const labelInput = useRef<React.ElementRef<typeof Input>>(null);
  const secretInput = useRef<React.ElementRef<typeof Input>>(null);
  const pendingSave = useRef<{
    key: string;
    account: ReturnType<typeof createManualOtpAccount>;
  } | null>(null);
  const submitLock = useRef(false);

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

  const labelError =
    (hasSubmitted || touched.label) &&
    validation.error === 'Enter an account label.'
      ? validation.error
      : null;
  const secretValidation = validateManualAccountBasics(
    { issuer, label: label.trim() || 'placeholder', secret, period, digits },
    existingSecrets
  );
  const secretError =
    (hasSubmitted || touched.secret) && secretValidation.error !== null
      ? secretValidation.error
      : (hasSubmitted || touched.secret) && secretValidation.isValid
        ? totpValidationError
        : null;
  const isSubmitDisabled =
    (isLoading && accounts.length === 0) || isSaving || storageError != null;

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
    setTouched(current => ({ ...current, secret: true }));

    if (!secretValidation.isValid) {
      return;
    }

    const checked = validateManualAccountWithTotp(
      { issuer, label: label.trim() || 'placeholder', secret, period, digits },
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
    secretValidation.isValid
  ]);

  const handleSubmit = useCallback(async () => {
    if (submitLock.current) {
      return;
    }

    setHasSubmitted(true);
    setTouched({ label: true, secret: true });
    setSaveError(null);

    if (isSubmitDisabled) {
      return;
    }

    const submitValidation = validateManualAccountWithTotp(
      { issuer, label, secret, period, digits },
      existingSecrets
    );

    if (!submitValidation.isValid) {
      const secretCheck = validateManualAccountWithTotp(
        {
          issuer,
          label: label.trim() || 'placeholder',
          secret,
          period,
          digits
        },
        existingSecrets
      );

      setTotpValidation({
        key: totpValidationKey,
        error: secretCheck.error
      });

      if (submitValidation.error === 'Enter an account label.') {
        labelInput.current?.focus();
      } else {
        secretInput.current?.focus();
      }

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
    submitLock.current = true;

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
      submitLock.current = false;
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

  if (isLoading && accounts.length === 0 && error == null && !isRetrying) {
    return (
      <View className="bg-background pb-safe flex-1 gap-6 px-6 pt-3">
        <Text className="text-muted-foreground text-base leading-6">
          Preparing saved accounts…
        </Text>
        <View className="gap-5">
          {[0, 1, 2, 3].map(item => (
            <View className="gap-2" key={item}>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-11 w-full rounded-lg" />
            </View>
          ))}
        </View>
        <Button disabled>
          <Text>Loading accounts…</Text>
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="bg-background flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        className="bg-background flex-1"
        contentContainerClassName="gap-6 px-6 pt-3 pb-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-muted-foreground text-base leading-6">
          Enter the setup key from the account&apos;s security settings. Your
          codes will stay on this device.
        </Text>

        {storageError != null ? (
          <View className="gap-3">
            <StatusMessage value="Saved accounts unavailable. We need to check your saved accounts before adding another. Try loading them again." />
            <Button
              accessibilityLabel="Retry loading saved accounts"
              disabled={isRetrying || isLoading}
              onPress={() => void handleRetry()}
              variant="outline"
            >
              <Text>
                {isRetrying || isLoading
                  ? 'Retrying…'
                  : 'Retry loading accounts'}
              </Text>
            </Button>
          </View>
        ) : null}

        <View className="gap-5">
          <Field label="Issuer · Optional">
            <Input
              accessibilityLabel="Issuer"
              autoCapitalize="words"
              autoCorrect={false}
              onChangeText={setIssuer}
              editable={!isSaving}
              placeholder="GitHub"
              value={issuer}
            />
          </Field>

          <Field label="Account label" required isInvalid={labelError != null}>
            <Input
              ref={labelInput}
              accessibilityLabel="Account label"
              accessibilityHint={labelError ?? undefined}
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setLabel}
              onBlur={() =>
                setTouched(current => ({ ...current, label: true }))
              }
              editable={!isSaving}
              placeholder="user@example.com"
              value={label}
            />
            {labelError != null ? (
              <Text
                accessibilityRole="alert"
                className="text-destructive text-sm"
              >
                {labelError}
              </Text>
            ) : null}
          </Field>

          <Field label="Secret key" required isInvalid={secretError != null}>
            <View className="relative">
              <Input
                ref={secretInput}
                accessibilityLabel="Secret key"
                accessibilityHint={
                  secretError ??
                  'Base32 setup key from your service. Spaces are allowed.'
                }
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect={false}
                importantForAutofill="no"
                keyboardType="default"
                onChangeText={value => {
                  setSecret(value.toUpperCase());
                  setTotpValidation(null);

                  if (touched.secret || hasSubmitted) {
                    setTouched(current => ({ ...current, secret: true }));
                  }
                }}
                onBlur={handleSecretBlur}
                placeholder="JBSW Y3DP EHPK 3PXP"
                secureTextEntry={!isSecretVisible}
                textContentType="none"
                value={secret}
                editable={!isSaving}
                className="pr-12"
              />
              <Button
                accessibilityLabel={
                  isSecretVisible ? 'Hide secret key' : 'Reveal secret key'
                }
                className="absolute top-0 right-0 size-11"
                disabled={isSaving}
                size="icon"
                variant="ghost"
                onPress={() => setIsSecretVisible(current => !current)}
              >
                <Icon
                  as={isSecretVisible ? EyeOff : Eye}
                  className="text-foreground size-5"
                />
              </Button>
            </View>
            {secretError != null ? (
              <Text
                accessibilityRole="alert"
                className="text-destructive text-sm"
              >
                {secretError}
              </Text>
            ) : null}
            <Text className="text-muted-foreground text-sm">
              Base32 setup key from your service. Spaces are allowed.
            </Text>
          </Field>

          <View className="border-border border-t pt-5">
            <Text
              accessibilityRole="header"
              className="text-foreground text-lg font-semibold"
            >
              Code settings
            </Text>
            <Text className="text-muted-foreground mt-1 mb-4 text-sm">
              Keep these values the same as your service&apos;s setup
              instructions.
            </Text>
            <View className="flex-row gap-4">
              <View className="flex-1">
                <Field label="Refresh period">
                  <SegmentedControl
                    disabled={isSaving}
                    options={PERIOD_OPTIONS}
                    selectedValue={period}
                    suffix=" sec"
                    onSelect={value => {
                      setPeriod(value);
                      setTotpValidation(null);
                    }}
                  />
                </Field>
              </View>

              <View className="flex-1">
                <Field label="Code length">
                  <SegmentedControl
                    disabled={isSaving}
                    options={DIGIT_OPTIONS}
                    selectedValue={digits}
                    onSelect={value => {
                      setDigits(value);
                      setTotpValidation(null);
                    }}
                  />
                </Field>
              </View>
            </View>
          </View>
        </View>

        {saveError != null ? (
          <StatusMessage
            value={`${saveError} Your details are still here. Save again to retry.`}
          />
        ) : null}
      </ScrollView>
      <View className="bg-background pb-safe gap-2 px-6 pt-3">
        <Button disabled={isSubmitDisabled} onPress={handleSubmit}>
          <Text>{isSaving ? 'Saving account…' : 'Save account'}</Text>
        </Button>
        <Text className="text-muted-foreground text-center text-xs">
          Your setup key stays on this device
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
