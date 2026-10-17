import { Button } from '@/components/ui/button';
import { CenteredState } from '@/components/ui/centered-state';
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
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

export function ScannerView() {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [footerHeight, setFooterHeight] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const hasNavigatedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      hasNavigatedRef.current = false;
      setError(null);
      setCameraError(null);
      setIsFocused(true);

      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  useEffect(() => {
    if (permission == null) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleRetryPermission = useCallback(() => {
    void requestPermission();
  }, [requestPermission]);

  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (hasNavigatedRef.current) {
      return;
    }

    if (result.type !== 'qr') {
      setError('Scan a QR code from your authenticator setup screen.');

      return;
    }

    const parsed = parseOtpAuthUri(result.data);

    if (!parsed.ok) {
      setError(parsed.error);

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

  const handleFooterLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;

    setFooterHeight(currentHeight =>
      Math.abs(currentHeight - nextHeight) < 1 ? currentHeight : nextHeight
    );
  }, []);

  if (permission == null) {
    return (
      <CenteredState
        description="Preparing camera permission..."
        title="Opening scanner"
      />
    );
  }

  if (!permission.granted) {
    return (
      <CenteredState
        action={
          permission.canAskAgain ? (
            <Button onPress={handleRetryPermission}>
              <Text>Try Again</Text>
            </Button>
          ) : (
            <Button onPress={handleRetryPermission}>
              <Text>Open Settings</Text>
            </Button>
          )
        }
        description="Camera access is needed to scan authenticator QR codes."
        title="Camera permission needed"
      />
    );
  }

  return (
    <View className="flex-1">
      {isFocused ? (
        <>
          <CameraView
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            facing="back"
            onMountError={({ message }) => {
              setCameraError(message || 'Camera preview could not start.');
            }}
            onBarcodeScanned={error == null ? handleBarcodeScanned : undefined}
            style={cameraStyles.camera}
          />
          <ScannerFrame verticalOffset={footerHeight / -2} />
        </>
      ) : null}

      <ScannerFooter
        error={error}
        cameraError={cameraError}
        onLayout={handleFooterLayout}
        onRetryScan={() => {
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
  onLayout,
  onRetryScan
}: {
  error: string | null;
  cameraError: string | null;
  onLayout: (event: LayoutChangeEvent) => void;
  onRetryScan: () => void;
}) {
  const handleRetryScan = useCallback(() => {
    onRetryScan();
  }, [onRetryScan]);

  return (
    <View
      className="bg-background pb-safe absolute inset-x-0 bottom-0"
      onLayout={onLayout}
    >
      <View className="gap-4 px-6 pt-6 pb-6">
        <Text className="text-foreground text-center text-lg font-semibold">
          Scan authenticator QR code
        </Text>
        <Text className="text-muted-foreground text-center text-sm leading-5">
          Position the TOTP QR code inside the camera view.
        </Text>
        {error != null ? (
          <View className="bg-card gap-3 rounded-lg px-4 py-4">
            <Text className="text-destructive text-center text-base font-semibold">
              {error}
            </Text>
            <Button onPress={handleRetryScan}>
              <Text>Scan Again</Text>
            </Button>
          </View>
        ) : null}
        {cameraError != null ? (
          <View className="bg-card rounded-lg px-4 py-4">
            <Text className="text-destructive text-center text-base font-semibold">
              {cameraError}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
