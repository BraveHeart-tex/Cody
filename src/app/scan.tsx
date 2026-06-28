import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult
} from 'expo-camera';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { createScannerDraft } from '@/src/features/totp/model/scanner-drafts';
import { parseOtpAuthUri } from '@/src/features/totp/model/parse-otpauth-uri';

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
            <PrimaryButton label="Try Again" onPress={handleRetryPermission} />
          ) : (
            <PrimaryButton
              label="Open Settings"
              onPress={Linking.openSettings}
            />
          )
        }
        description="Camera access is needed to scan authenticator QR codes."
        title="Camera permission needed"
      />
    );
  }

  return (
    <View className="flex-1 bg-black">
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
      <View className="absolute inset-x-0 bottom-0 gap-4 bg-black/70 px-6 pt-6 pb-12">
        <Text className="text-center text-lg font-semibold text-white">
          Scan authenticator QR code
        </Text>
        <Text className="text-center text-sm leading-5 text-white/80">
          Position the TOTP QR code inside the camera view.
        </Text>
        {error != null ? (
          <View className="gap-3 rounded-lg bg-white px-4 py-4">
            <Text className="text-center text-base font-semibold text-red-700">
              {error}
            </Text>
            <PrimaryButton label="Scan Again" onPress={handleRetryScan} />
          </View>
        ) : null}
        {cameraError != null ? (
          <View className="rounded-lg bg-white px-4 py-4">
            <Text className="text-center text-base font-semibold text-red-700">
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
    <View className="flex-1 items-center justify-center gap-5 bg-white px-8">
      <View className="gap-2">
        <Text className="text-center text-2xl font-semibold text-neutral-950">
          {title}
        </Text>
        <Text className="text-center text-base leading-6 text-neutral-600">
          {description}
        </Text>
      </View>
      {action}
    </View>
  );
}

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
}

function PrimaryButton({ label, onPress }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className="items-center rounded-lg bg-orange-500 px-5 py-3"
      onPress={onPress}
    >
      <Text className="text-base font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1
  }
});
