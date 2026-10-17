import { Button } from '@/components/ui/button';
import { ScannerPermissionState } from '@/features/scanner/components/scanner-permission-state';
import { Icon } from '@/components/ui/icon';
import { CameraOff, ShieldCheck, TriangleAlert } from 'lucide-react-native';
import {
  getScanError,
  type ScanError
} from '@/features/scanner/model/scan-error';
import { Text } from '@/components/ui/text';
import { ScannerFrame } from '@/features/scanner/components/scanner-frame';
import { parseOtpAuthUri } from '@/features/totp/model/parse-otpauth-uri';
import { createScannerDraft } from '@/features/totp/model/scanner-drafts';
import {
  type BarcodeScanningResult,
  CameraView,
  useCameraPermissions
} from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';

export function ScannerView() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [error, setError] = useState<ScanError | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const hasNavigatedRef = useRef(false);
  const scanPausedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      hasNavigatedRef.current = false;
      scanPausedRef.current = false;
      setError(null);
      setCameraError(null);
      setIsFocused(true);

      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  useEffect(() => {
    if (permission?.status === 'undetermined' && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        void getPermission().catch(() => undefined);
      }
    });

    return () => subscription.remove();
  }, [getPermission]);

  const handleRetryPermission = useCallback(() => {
    void requestPermission();
  }, [requestPermission]);

  const handleOpenSettings = useCallback(() => {
    void Linking.openSettings().catch(() => undefined);
  }, []);

  const handleManualEntry = useCallback(() => {
    router.push('/add-account/manual');
  }, []);

  const handleRetryCamera = useCallback(() => {
    setCameraError(null);
    setError(null);
    scanPausedRef.current = false;
    setCameraKey(currentKey => currentKey + 1);
  }, []);

  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (hasNavigatedRef.current || scanPausedRef.current) {
      return;
    }

    if (result.type !== 'qr') {
      scanPausedRef.current = true;
      setError(getScanError(''));

      return;
    }

    const parsed = parseOtpAuthUri(result.data);

    if (!parsed.ok) {
      scanPausedRef.current = true;
      setError(getScanError(result.data, parsed.error));

      return;
    }

    hasNavigatedRef.current = true;

    triggerScanSuccessFeedback();

    const draftId = createScannerDraft(parsed.account);

    router.push({
      pathname: '/account-confirm',
      params: { draftId }
    });
  }, []);

  if (permission == null || permission.status === 'undetermined') {
    return (
      <ScannerPermissionState
        description="Preparing camera permission..."
        title="Opening scanner"
      />
    );
  }

  if (!permission.granted) {
    return (
      <ScannerPermissionState
        action={
          <View className="gap-3">
            {permission.canAskAgain ? (
              <Button onPress={handleRetryPermission}>
                <Text>Try Again</Text>
              </Button>
            ) : (
              <Button onPress={handleOpenSettings}>
                <Text>Open Settings</Text>
              </Button>
            )}
            <Button onPress={handleManualEntry} variant="outline">
              <Text>Enter Setup Key Manually</Text>
            </Button>
          </View>
        }
        description={
          permission.canAskAgain
            ? 'Camera access is needed to scan authenticator QR codes.'
            : 'Camera access is turned off. Open Settings to enable it, or enter the setup key manually.'
        }
        title={
          permission.canAskAgain
            ? 'Camera permission needed'
            : 'Camera access is off'
        }
      />
    );
  }

  return (
    <View className="bg-background flex-1">
      <View className="bg-muted min-h-32 flex-1 overflow-hidden">
        {isFocused && cameraError == null ? (
          <>
            <CameraView
              key={cameraKey}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              facing="back"
              onMountError={() => {
                scanPausedRef.current = true;
                setError(null);
                setCameraError('Camera preview could not start.');
              }}
              onBarcodeScanned={
                error == null && cameraError == null
                  ? handleBarcodeScanned
                  : undefined
              }
              style={cameraStyles.camera}
            />
            <ScannerFrame />
          </>
        ) : null}

        {cameraError != null ? (
          <View className="flex-1 items-center justify-center gap-3 px-6">
            <Icon as={CameraOff} className="text-muted-foreground size-10" />
            <Text className="text-muted-foreground text-center">
              Camera unavailable
            </Text>
          </View>
        ) : null}
      </View>
      <ScannerFooter
        error={error}
        cameraError={cameraError}
        onManualEntry={handleManualEntry}
        onRetryCamera={handleRetryCamera}
        onRetryScan={() => {
          scanPausedRef.current = false;
          setError(null);
        }}
      />
    </View>
  );
}

function triggerScanSuccessFeedback() {
  void Haptics.notificationAsync(
    Haptics.NotificationFeedbackType.Success
  ).catch(() => undefined);
}

const cameraStyles = StyleSheet.create({
  camera: {
    flex: 1
  }
});

function ScannerFooter({
  error,
  cameraError,
  onRetryScan,
  onRetryCamera,
  onManualEntry
}: {
  error: ScanError | null;
  cameraError: string | null;
  onRetryScan: () => void;
  onRetryCamera: () => void;
  onManualEntry: () => void;
}) {
  const handleRetryScan = useCallback(() => {
    onRetryScan();
  }, [onRetryScan]);

  return (
    <ScrollView
      className="bg-background max-h-1/2 shrink-0 grow-0"
      contentContainerClassName="pb-safe"
      bounces={false}
    >
      <View className="gap-4 px-6 pt-6 pb-6">
        <Text className="text-foreground text-center text-lg font-semibold">
          {cameraError != null
            ? 'Scanner unavailable'
            : 'Scan authenticator QR code'}
        </Text>
        <Text className="text-muted-foreground text-center text-sm leading-5">
          {cameraError != null
            ? 'The camera could not start.'
            : 'Position a setup QR code inside the frame.'}
        </Text>
        {error != null ? (
          <View className="bg-destructive/10 border-destructive/30 gap-3 rounded-xl border p-4">
            <View className="flex-row items-start gap-2">
              <Icon
                as={TriangleAlert}
                className="text-destructive mt-1 size-5"
              />
              <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                className="text-foreground flex-1 text-base font-semibold"
              >
                {error.title}
              </Text>
            </View>
            <Text className="text-muted-foreground text-sm leading-5">
              {error.description}
            </Text>
            <Button onPress={handleRetryScan}>
              <Text>Scan Again</Text>
            </Button>
          </View>
        ) : null}
        {cameraError != null ? (
          <View className="bg-destructive/10 border-destructive/30 gap-3 rounded-xl border p-4">
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              className="text-foreground text-base font-semibold"
            >
              {cameraError}
            </Text>
            <Text className="text-muted-foreground text-sm leading-5">
              Try restarting the camera, or enter a setup key manually.
            </Text>
            <Button onPress={onRetryCamera}>
              <Text>Retry Camera</Text>
            </Button>
            <Button onPress={onManualEntry} variant="outline">
              <Text>Enter Setup Key Manually</Text>
            </Button>
          </View>
        ) : null}
        {error == null && cameraError == null ? (
          <View className="flex-row justify-center gap-2">
            <Icon
              as={ShieldCheck}
              className="text-muted-foreground mt-0.5 size-4"
            />
            <Text className="text-muted-foreground shrink text-center text-xs leading-5">
              Scanned details stay on this device
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
