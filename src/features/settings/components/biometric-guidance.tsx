import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

import { getBiometricsSupportStatus } from '@/features/settings/model/biometrics';

export function BiometricGuidance({
  onAvailable
}: {
  onAvailable?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [openError, setOpenError] = useState(false);

  const waitingForSettings = useRef(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' || !waitingForSettings.current) {
        return;
      }

      waitingForSettings.current = false;
      void getBiometricsSupportStatus()
        .then(support => {
          if (disposed) {
            return;
          }

          if (support.isSupported) {
            setCheckMessage(
              'Biometrics are ready. Try again to confirm your identity.'
            );
            onAvailable?.();
          } else {
            setCheckMessage(
              'Cody still needs supported biometrics. Follow the device settings steps, then try again.'
            );
          }
        })
        .catch(() => {
          if (!disposed) {
            setCheckMessage(
              'Couldn’t check biometrics. Try again when you’re ready.'
            );
          }
        });
    });

    return () => {
      disposed = true;
      subscription.remove();
    };
  }, [onAvailable]);

  async function openSettings() {
    setOpenError(false);
    setCheckMessage(null);
    waitingForSettings.current = true;

    try {
      if (Platform.OS === 'android') {
        await Linking.sendIntent('android.settings.SECURITY_SETTINGS');
      } else {
        await Linking.openSettings();
      }
    } catch {
      waitingForSettings.current = false;
      setOpenError(true);
    }
  }

  return (
    <View className="w-full gap-3">
      <Button
        variant="ghost"
        className="h-auto min-h-11 py-3"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded(value => !value)}
      >
        <Text className="text-primary flex-1 text-center">
          {expanded
            ? 'Hide device settings steps'
            : 'See device settings steps'}
        </Text>
      </Button>
      {expanded && (
        <View className="bg-accent gap-3 rounded-xl p-4">
          <Text className="text-accent-foreground text-sm leading-5">
            {Platform.OS === 'android'
              ? 'In device Settings, open Security or Biometrics and enroll a strong biometric method, such as a fingerprint. Return to Cody to try again.'
              : 'In device Settings, open Face ID & Passcode or Touch ID & Passcode and enroll your biometrics. Allow Face ID for Cody if requested, then return to try again. The button below opens Cody’s app settings.'}
          </Text>
          {Platform.OS !== 'web' && (
            <Button
              variant="outline"
              className="h-auto min-h-11 py-3"
              onPress={() => void openSettings()}
            >
              <Text className="flex-1 text-center">
                {Platform.OS === 'android'
                  ? 'Open security settings'
                  : 'Open Cody settings'}
              </Text>
            </Button>
          )}
          {checkMessage && (
            <Text
              accessibilityLiveRegion="polite"
              className="text-accent-foreground text-sm leading-5"
            >
              {checkMessage}
            </Text>
          )}
          {openError && (
            <Text
              accessibilityLiveRegion="polite"
              className="text-accent-foreground text-sm leading-5"
            >
              Couldn’t open settings. Open your device’s Settings app and follow
              the steps above.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
