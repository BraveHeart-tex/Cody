import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import { createAccountId } from '@/features/totp/model/account-id';
import {
  validateManualAccount,
  type ManualTotpDigits,
  type ManualTotpPeriod
} from '@/features/totp/model/manual-account';
import type { OtpAccount } from '@/features/totp/model/totp-account';
import { cn } from '@/lib/utils/cn';

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

    const account: OtpAccount = {
      id: createAccountId(),
      issuer: validation.issuer,
      label: validation.label,
      secret: validation.secret,
      type: 'totp',
      algorithm: 'SHA1',
      digits,
      period,
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
      contentContainerClassName="gap-6 px-6 pt-safe pb-safe"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-4 pt-6">
        <Button
          className="self-start"
          variant="outline"
          onPress={() => router.back()}
        >
          <Text>Back</Text>
        </Button>
        <View className="gap-2">
          <Text className="text-foreground text-3xl font-semibold">
            Enter setup key
          </Text>
          <Text className="text-muted-foreground text-base leading-6">
            Add an authenticator account with the manual setup details.
          </Text>
        </View>
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

interface FieldProps {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}

function Field({ children, label, required = false }: FieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-foreground text-sm font-semibold">
        {label}
        {required ? (
          <Text className="text-destructive text-sm font-semibold"> *</Text>
        ) : null}
      </Text>
      {children}
    </View>
  );
}

interface SegmentedControlProps<T extends number> {
  onSelect: (value: T) => void;
  options: T[];
  selectedValue: T;
  suffix?: string;
}

function SegmentedControl<T extends number>({
  onSelect,
  options,
  selectedValue,
  suffix = ''
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row gap-2">
      {options.map(option => {
        const isSelected = option === selectedValue;

        return (
          <Button
            accessibilityState={{ selected: isSelected }}
            className={cn('flex-1', isSelected && 'border-primary')}
            key={option}
            variant={isSelected ? 'default' : 'outline'}
            onPress={() => onSelect(option)}
          >
            <Text>
              {option}
              {suffix}
            </Text>
          </Button>
        );
      })}
    </View>
  );
}

interface StatusMessageProps {
  value: string;
}

function StatusMessage({ value }: StatusMessageProps) {
  return (
    <Text className="bg-destructive text-destructive-foreground rounded-lg px-4 py-3 text-center text-base font-semibold">
      {value}
    </Text>
  );
}
