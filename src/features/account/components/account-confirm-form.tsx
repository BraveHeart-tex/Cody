import { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { StatusMessage } from '@/components/ui/status-message';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import {
  ScanLine,
  ShieldCheck,
  TriangleAlert,
  UserRound
} from 'lucide-react-native';
import { useAccounts } from '@/features/totp/hooks/use-accounts';
import { createScannedOtpAccount } from '@/features/totp/model/create-account';
import { DuplicateAccountSecretError } from '@/features/totp/model/account-errors';
import { normalizeAccountSecret } from '@/features/totp/model/account-secret';
import type { TotpDraft } from '@/features/totp/model/parse-otpauth-uri';
import { canGenerateTotpCode } from '@/features/totp/model/totp-code';
import { deleteScannerDraft } from '@/features/totp/model/scanner-drafts';

interface AccountConfirmFormProps {
  draft: TotpDraft | null;
  draftId: string | undefined;
  onCancel: () => void;
  onDraftExpiredScan: () => void;
  onSaved: () => void;
}

export function AccountConfirmForm({
  draft,
  draftId,
  onCancel,
  onDraftExpiredScan,
  onSaved
}: AccountConfirmFormProps) {
  const { accounts, addAccount, error, isLoading, retryLoad } = useAccounts();
  const [label, setLabel] = useState(() => draft?.label ?? '');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const pendingSave = useRef<{
    key: string;
    account: ReturnType<typeof createScannedOtpAccount>;
  } | null>(null);

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

  const isDuplicate =
    draft != null &&
    accounts.some(
      account =>
        account.secret != null &&
        normalizeAccountSecret(account.secret) ===
          normalizeAccountSecret(draft.secret)
    );
  const secretError =
    draft != null &&
    !canGenerateTotpCode({
      ...draft,
      period: draft.period ?? 30
    })
      ? 'Scan a QR code with a valid authenticator secret.'
      : null;
  const trimmedLabel = label.trim();
  const labelError =
    draft != null && trimmedLabel.length === 0
      ? 'Enter an account label.'
      : null;

  const handleSave = useCallback(async () => {
    if (draft == null || draftId == null || isLoading || isSaving) {
      return;
    }

    if (isDuplicate) {
      setSaveError('This account is already saved.');

      return;
    }

    if (labelError != null || secretError != null) {
      return;
    }

    const inputKey = JSON.stringify({ draft, label: trimmedLabel });
    const account =
      pendingSave.current?.key === inputKey
        ? pendingSave.current.account
        : createScannedOtpAccount(draft, trimmedLabel);

    pendingSave.current = { key: inputKey, account };

    try {
      setIsSaving(true);
      setSaveError(null);
      await addAccount(account);
      pendingSave.current = null;
      deleteScannerDraft(draftId);
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
    draft,
    draftId,
    isDuplicate,
    isLoading,
    isSaving,
    labelError,
    secretError,
    onSaved,
    trimmedLabel
  ]);

  if (draft == null) {
    return (
      <ScrollView
        className="bg-background flex-1"
        contentContainerClassName="grow items-center justify-center gap-6 px-8 py-8 pb-safe"
      >
        <View className="bg-accent rounded-full p-6">
          <Icon as={ScanLine} className="text-accent-foreground size-10" />
        </View>
        <View className="gap-2">
          <Text className="text-foreground text-center text-2xl font-semibold">
            Scan session expired
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-6">
            This scanned account is no longer available. Scan the QR code again
            to continue.
          </Text>
        </View>
        <Button onPress={onDraftExpiredScan}>
          <Text>Back to Scanner</Text>
        </Button>
      </ScrollView>
    );
  }

  const storageError =
    error == null
      ? null
      : 'Cody could not read the saved accounts. Retry to try again.';
  const isSaveDisabled =
    isLoading ||
    isSaving ||
    storageError != null ||
    isDuplicate ||
    labelError != null ||
    secretError != null;

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerClassName="gap-6 px-6 pt-3 pb-safe"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-muted-foreground text-base leading-6">
        Check the account details before adding it to Cody.
      </Text>

      <View className="flex-row items-center gap-4">
        <View className="bg-accent size-16 items-center justify-center rounded-2xl">
          {draft.issuer.trim() ? (
            <Text className="text-accent-foreground text-xl font-bold">
              {Array.from(draft.issuer.trim())
                .slice(0, 1)
                .join('')
                .toUpperCase()}
            </Text>
          ) : (
            <Icon as={UserRound} className="text-accent-foreground size-7" />
          )}
        </View>
        <View className="flex-1 gap-1">
          <Text
            accessibilityRole="header"
            className="text-foreground text-2xl font-bold"
          >
            {draft.issuer.trim() || 'Authenticator account'}
          </Text>
          <Text className="text-muted-foreground text-sm">
            Scanned authenticator · TOTP
          </Text>
        </View>
      </View>

      {isDuplicate ? (
        <ReviewNotice
          title="Account already added"
          description="This account is already saved."
        />
      ) : null}
      {secretError != null ? (
        <ReviewNotice
          title="Can't use these account details"
          description={secretError}
        />
      ) : storageError != null ? (
        <ReviewNotice
          title="Couldn't check saved accounts"
          description={storageError}
        />
      ) : null}

      <View>
        <Field
          isInvalid={labelError != null}
          label="Account label"
          labelClassName="text-muted-foreground text-sm font-medium"
          labelTestID="account-label-field-label"
          required
        >
          <Input
            aria-invalid={labelError != null}
            aria-describedby={
              labelError != null ? 'account-label-error' : undefined
            }
            editable={!isSaving}
            placeholder="Account name or email"
            accessibilityLabel="Account label"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setLabel}
            value={label}
          />
          {labelError != null ? (
            <Text
              nativeID="account-label-error"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              className="text-destructive text-sm leading-5"
            >
              {labelError}
            </Text>
          ) : null}
        </Field>
      </View>

      <View className="border-border bg-card gap-4 rounded-xl border p-4">
        <DetailRow label="Code length" value={`${draft.digits} digits`} />
        <DetailRow
          label="Refresh interval"
          value={`${draft.period ?? 30} seconds`}
        />
        <DetailRow
          label="Algorithm"
          value={draft.algorithm.replace('SHA', 'SHA-')}
        />
      </View>
      <View className="flex-row items-start gap-3">
        <Icon
          as={ShieldCheck}
          className="text-muted-foreground mt-0.5 size-5"
        />
        <Text className="text-muted-foreground flex-1 text-sm leading-5">
          Setup keys are never displayed here and remain stored locally on your
          device.
        </Text>
      </View>

      <View className="gap-3 pb-6">
        {saveError != null &&
        secretError == null &&
        storageError == null &&
        !isDuplicate ? (
          <StatusMessage value={saveError} />
        ) : null}
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
        <Button disabled={isSaveDisabled} onPress={handleSave}>
          <Text>
            {isSaving ? 'Saving...' : isLoading ? 'Loading...' : 'Save Account'}
          </Text>
        </Button>
        <Button variant="outline" disabled={isSaving} onPress={onCancel}>
          <Text>Cancel</Text>
        </Button>
      </View>
    </ScrollView>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View className="flex-row flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <Text className="text-muted-foreground text-sm">{label}</Text>
      <Text className="text-foreground text-sm font-semibold">{value}</Text>
    </View>
  );
}

function ReviewNotice({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="bg-destructive/10 border-destructive/30 flex-row items-start gap-3 rounded-xl border p-4"
    >
      <Icon as={TriangleAlert} className="text-destructive mt-0.5 size-5" />
      <View className="flex-1 gap-1">
        <Text className="text-foreground text-base font-semibold">{title}</Text>
        <Text className="text-muted-foreground text-sm leading-5">
          {description}
        </Text>
      </View>
    </View>
  );
}
