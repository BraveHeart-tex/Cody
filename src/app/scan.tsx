import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult
} from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ScannerFrame } from '@/features/scanner/components/scanner-frame';
import { parseOtpAuthUri } from '@/features/totp/model/parse-otpauth-uri';
import { createScannerDraft } from '@/features/totp/model/scanner-drafts';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
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

    const draftId = createScannerDraft(parsed.account);

    router.push({
      pathname: '/account-confirm',
      params: { draftId }
    });
  }, []);

  const handleRetryScan = useCallback(() => {
    setError(null);
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
    <View className="bg-background flex-1">
      {isFocused ? (
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          facing="back"
          onMountError={({ message }) => {
            setCameraError(message || 'Camera preview could not start.');
          }}
          onBarcodeScanned={error == null ? handleBarcodeScanned : undefined}
          style={styles.camera}
        />
      ) : null}

      <ScannerFrame />

      <View className="bg-background/70 absolute inset-x-0 bottom-0 gap-4 px-6 pt-6 pb-12">
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

interface CenteredStateProps {
  action?: React.ReactNode;
  description: string;
  title: string;
}

function CenteredState({ action, description, title }: CenteredStateProps) {
  return (
    <View className="bg-background flex-1 items-center justify-center gap-5 px-8">
      <View className="gap-2">
        <Text className="text-foreground text-center text-2xl font-semibold">
          {title}
        </Text>
        <Text className="text-muted-foreground text-center text-base leading-6">
          {description}
        </Text>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1
  }
});
